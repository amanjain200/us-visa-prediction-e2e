# US Visa Prediction E2E

## From a case record to a model that can be trusted enough to ship

Most “ML projects” stop at a notebook: load a CSV, fit a classifier, print an accuracy score.

This project follows the more interesting question:

> What has to happen before a model can turn a new visa case into a decision inside an application?

The answer here is an end-to-end machine-learning workflow: data is pulled from MongoDB, materialised as versioned artifacts, checked against a schema, analysed for drift, transformed with reusable preprocessing, used to train candidate models, compared with the current S3 model, and promoted only when it wins. A FastAPI application then loads the promoted model and serves predictions through a browser-based interface.

The result is a compact demonstration of production-minded ML engineering—not just model training.

> **Important:** This is a predictive demonstration built on historical case data. It is not legal, immigration, or government advice, and it must not be used as an automated decision-maker for real applicants.

## Why this project is worth looking at

This repository is intentionally useful as a portfolio project for AI Engineer, Agentic AI Engineer, AI FDE, and Analytics Engineering roles because it connects several layers that are often shown separately:

- **Data and analytics:** schema-driven feature definitions, derived features, class-imbalance handling, exploratory analysis, and drift reporting.
- **ML engineering:** explicit pipeline stages, typed configuration/artifact objects, reusable preprocessing, candidate-model search, model evaluation, and model packaging.
- **AI application delivery:** a FastAPI inference surface, HTML form, client-side validation, loading states, and a human-readable result page.
- **Operational thinking:** a model promotion decision compares a new candidate with the currently stored S3 model instead of blindly overwriting production.

It is not an agent—and that is useful context. Agentic systems still need reliable tools, validated inputs, state hand-offs, evaluation gates, and deployment boundaries. This project exercises those foundations before adding an LLM or an autonomous loop.

## The workflow

```text
MongoDB collection
        │
        ▼
Data ingestion ──► feature store + train/test CSVs
        │
        ▼
Schema checks + Evidently drift report
        │
        ▼
Feature engineering + preprocessing + SMOTEENN
        │
        ▼
Candidate model search (KNN / Random Forest)
        │
        ▼
Metric check ──► compare with current S3 model
        │                         │
        └──────── accepted ──────┘
                                  ▼
                         Push model.pkl to S3
                                  │
                                  ▼
                    FastAPI + Jinja2 prediction UI
```

The training pipeline is orchestrated by `TrainPipeline` and hands each stage a small artifact object rather than passing hidden global state around:

1. **Ingestion** reads the `US_VISA_DATA` MongoDB collection, writes a feature-store snapshot, and creates an 80/20 train/test split.
2. **Validation** checks the expected column count and required numerical/categorical columns, then generates an Evidently data-drift report.
3. **Transformation** derives `company_age`, drops identifier/year fields, applies configured encoders and numeric transforms, and uses `SMOTEENN` on the training data to address class imbalance.
4. **Training** uses `neuro_mf` with the YAML model configuration to search K-Nearest Neighbours and Random Forest candidates. The best candidate must clear the configured baseline score of `0.60`.
5. **Evaluation** scores the candidate with F1 and compares it with the model already stored in S3.
6. **Promotion** uploads the candidate as `model.pkl` only when the candidate is better than the current production model.
7. **Prediction** loads the packaged preprocessing object and estimator together, so inference receives raw form fields in the same shape as training inputs.

### Operational cadence

There is no scheduler or CI/CD trigger configured in the repository yet. Training is currently **manual and on-demand**:

- `python demo.py` runs the complete training workflow.
- `GET /train` runs the same workflow synchronously through the web app.
- Each training run performs ingestion, validation, transformation, candidate-model training, evaluation, and—if accepted—promotion to S3.
- Predictions do not retrain the model. The prediction route loads the promoted S3 model and applies it to the submitted form data.

In a deployed version, this workflow would normally be triggered on a schedule or by a data-refresh event—for example, weekly, monthly, or when a new batch of labelled cases arrives. The right cadence depends on how quickly the data distribution changes and how expensive/important retraining is. The current code provides the pipeline and promotion gate, but leaves scheduling and orchestration to the deployment environment.

## What the model sees

The application collects ten input features:

| Group | Features |
| --- | --- |
| Applicant | continent, education level, prior job experience, job-training requirement |
| Employer | employee count, company age, employment region |
| Compensation | prevailing wage, wage unit, full-time position |

The transformation configuration lives in [`config/schema.yaml`](config/schema.yaml), rather than being buried in a notebook. In the current implementation:

- `continent`, `unit_of_wage`, and `region_of_employment` use one-hot encoding.
- education, experience, training, and position fields use ordinal encoding.
- numeric fields are scaled and selected fields use a Yeo–Johnson power transform.
- `company_age` is derived from `yr_of_estab` using the current calendar year.
- `case_id` and `yr_of_estab` are removed before training.

The candidate models and search spaces are configured in [`config/model.yaml`](config/model.yaml). That makes the experiment inspectable and changeable without rewriting the trainer.

## Repository map

```text
.
├── app.py                         FastAPI app, routes, and form handling
├── config/
│   ├── schema.yaml                Data contract and feature transformation groups
│   └── model.yaml                 Candidate models and search parameters
├── us_visa/
│   ├── components/                Ingestion, validation, transformation, train/eval/push
│   ├── configuration/             MongoDB and AWS client setup
│   ├── data_access/                MongoDB → pandas access layer
│   ├── entity/                    Config, artifact, estimator, and S3 wrapper objects
│   ├── pipeline/                  Training and prediction orchestration
│   ├── utils/                     YAML, object, NumPy, and dataframe utilities
│   ├── cloud_storage/             S3 model and dataframe operations
│   ├── logger/                    Timestamped file logging
│   └── exception/                 Context-rich custom exceptions
├── notebook/                      EDA, feature engineering, drift, and MongoDB experiments
├── templates/                     Jinja2 prediction page
├── static/                        CSS and browser-side validation/animation
├── artifact/                      Timestamped local pipeline outputs (generated)
├── demo.py                        Run the full training pipeline
└── requirements.txt               Python dependencies
```

## Run it locally

### 1. Create an environment

```bash
python -m venv .venv

# macOS/Linux
source .venv/bin/activate

# Windows PowerShell
.\.venv\Scripts\Activate.ps1
```

Install the dependencies:

```bash
pip install -r requirements.txt
```

The project also installs itself through the editable `-e .` entry in `requirements.txt`.

### 2. Configure external services

Create a local `.env` file. Do not commit it.

```dotenv
connection_url=<mongodb-connection-string>
AWS_ACCESS_KEY_ID=<aws-access-key>
AWS_SECRET_ACCESS_KEY=<aws-secret-key>
```

The code expects:

- MongoDB database: `US_VISA`
- MongoDB collection: `US_VISA_DATA`
- AWS region: `us-east-1`
- S3 bucket configured in `us_visa/constants/__init__.py`
- S3 model key: `model.pkl`

The training pipeline needs MongoDB access. The prediction route needs access to the promoted S3 model unless you adapt `USvisaEstimator` to load a local artifact.

### 3. Train and promote a model

Run the complete workflow from the repository root:

```bash
python demo.py
```

Generated outputs are written beneath a timestamped folder in `artifact/`, including:

- feature-store, train, and test CSVs;
- the Evidently drift report;
- transformed NumPy arrays;
- the fitted preprocessing object;
- the packaged trained model;
- timestamped logs and in-memory evaluation/promotion artifacts.

You can also trigger training through the app’s `/train` route, but treat that route as an internal development hook—not a production training interface.

### 4. Start the application

```bash
python app.py
```

The app binds to `0.0.0.0:8080`. Open:

```text
http://localhost:8080/
```

The browser form sends the ten fields to `POST /`. The `GET /train` route runs the training pipeline and returns a plain-text status.

## Notebooks and generated analysis

The `notebook/` directory contains the exploratory and experimental trail behind the pipeline:

- `EDA.ipynb` — exploratory analysis of the EasyVisa data.
- `feature_engineering_and_model_training.ipynb` — feature preparation and model experiments.
- `data_drift_demo.ipynb` — drift analysis experimentation.
- `mongodb_exp.ipynb` — MongoDB connectivity and data-access experiments.
- `boston_data_drift_report.html` — a generated Evidently report artifact.

The notebooks are useful for understanding the reasoning, while the Python package contains the repeatable path used by the application.

## Engineering notes and honest next steps

The README should make the system legible, not pretend it is more production-ready than it is. Before calling this a production decision service, I would address the following:

1. **Verify target semantics.** `TargetValueMapping` currently maps `Certified → 0` and `Denied → 1`, while `app.py` renders `1` as `Visa-approved`. That label/UI mismatch must be resolved before any real interpretation of predictions.
2. **Make drift a real gate.** The validation stage writes a drift report and detects drift, but the current `validation_status` is determined by schema/column checks; drift is recorded in the message rather than reliably blocking transformation.
3. **Freeze the feature definition.** `company_age` uses `date.today().year`, so the same historical row can transform differently over time. A reference year or explicit data contract would make retraining reproducible.
4. **Add automated tests and CI.** The repository has no visible test suite; unit tests for schema validation, feature transformation, target mapping, model comparison, and the prediction route would be the next high-value addition.
5. **Harden the service boundary.** CORS is currently open to all origins, `/train` is unauthenticated and synchronous, and the app has no request schema or typed JSON API. Authentication, background jobs, health checks, and structured responses belong in a production version.
6. **Finish packaging/deployment.** `Dockerfile` is currently a placeholder. A reproducible image, environment-based configuration, and a small deployment smoke test would complete the path to the ECR target referenced by the local setup.

These are not footnotes; they are exactly the seams where an ML prototype becomes an operable AI system.

## The point of the project

The model is only one component. The more useful engineering exercise is making the path around it explicit: where data comes from, what gets checked, how a candidate is judged, when it is allowed to replace the current model, and how the application consumes the resulting artifact.

## Security note

Credentials belong in environment variables or a secret manager, never in source control. If this repository has ever been shared with the `.env` values that were used during development, revoke and rotate those credentials before publishing the project or deploying it.

## License

This project is licensed under the [MIT License](LICENSE).
