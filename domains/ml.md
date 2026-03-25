# ML Domain

For machine learning inference, data preparation, and model management. Folia is the **data preparation and inference layer** — not a training platform. The ML ecosystem has mature training tools (TorchGeo, InstaGeo, TerraTorch); folia fills the gap between trained models and deployed predictions with provenance.

*Decided in [ADR-0006](/decisions/#adr-0006)*

## Schema Extension

The `ml:` block on a layer declares machine learning metadata. It applies to three layer variants: **model layers** (a trained model), **prediction layers** (inference output), and **embedding layers** (foundation model representations).

| Field | Type | Required | Description |
|---|---|---|---|
| `task` | string | Yes | ML task: `classification`, `segmentation`, `detection`, `regression`, `embedding` |
| `architecture` | string | No | Model architecture family (e.g., `unet`, `vit`, `resnet`) |
| `foundation_model` | string | No | Base foundation model if fine-tuned (e.g., `prithvi-100m`, `clay-v1`) |
| `model_ref` | string | No | Reference to model artifact URI (on prediction layers) |
| `format` | string | No | Model format: `onnx`, `torchscript`, `safetensors` |
| `input_bands` | list | No | Expected input bands (e.g., `[B02, B03, B04, B08]`) |
| `input_shape` | list | No | Expected input tensor shape (`[C, T, H, W]` or `[C, H, W]`) |
| `output_classes` | list | No | Class definitions: `[{id: 0, name: background}, ...]` |
| `embedding_dim` | integer | No | Embedding vector dimensionality |
| `metrics` | object | No | Evaluation metrics (e.g., `{miou: 0.61, accuracy: 0.83}`) |
| `param_count` | integer | No | Number of model parameters |
| `training_data` | string | No | URI of training dataset |
| `distilled_from` | string | No | URI of teacher model (if distilled) |
| `compression_ratio` | number | No | Size reduction vs. teacher model |

### Model Layer

A trained model stored as a versioned artifact:

```yaml
layers:
  models/crop-segmentation:
    type: model
    uri: catalog://models/crop-segmentation-sentinel2@v3

    ml:
      task: segmentation
      architecture: unet
      foundation_model: prithvi-100m
      input_bands: [B02, B03, B04, B08]
      input_shape: [4, 6, 224, 224]
      output_classes:
        - { id: 0, name: background }
        - { id: 1, name: corn }
        - { id: 2, name: soybean }
        - { id: 3, name: wheat }
      metrics:
        miou: 0.61
        accuracy: 0.83
      format: onnx

    geo:
      bbox: [-10.0, 35.0, 30.0, 60.0]
    temporal:
      range: [2024-01-01, 2024-12-31]
```

### Prediction Layer

Output of running inference — a computed layer like any other:

```yaml
layers:
  predictions/crop-type-iowa:
    type: raster
    compute:
      op: predict
      inputs:
        imagery: { layer: imagery/hls-iowa }
      params:
        model: catalog://models/crop-segmentation-sentinel2@v3

    ml:
      model_ref: catalog://models/crop-segmentation-sentinel2@v3
      task: segmentation

    style:
      palette: categorical
      legend: true
```

### Embedding Layer

Precomputed embeddings from a foundation model — an intermediate representation for lightweight downstream tasks:

```yaml
layers:
  embeddings/prithvi-conus-2024:
    type: raster
    uri: catalog://embeddings/prithvi-conus-2024@v1

    ml:
      task: embedding
      foundation_model: prithvi-100m
      embedding_dim: 768
      input_bands: [B02, B03, B04, B05, B06, B07]

    geo:
      bbox: [-125, 24, -66, 50]
    temporal:
      range: [2024-01-01, 2024-12-31]
```

## Operation Categories

The ML domain organizes operations into 5 categories:

| Category | Operations | Description |
|---|---|---|
| prepare | `chip`, `temporal_composite`, `label_rasterize`, `train_test_split`, `cloud_filter` | Transform raw imagery into ML-ready training data |
| inference | `predict`, `predict_batch` | Run model inference on imagery |
| embed | `compute_embeddings`, `linear_probe` | Generate and use foundation model embeddings |
| distill | `distill` | Compress models via knowledge distillation |
| evaluate | `evaluate`, `confusion_matrix` | Assess model predictions against ground truth |

### Key Operations

| Operation | Type | Description |
|---|---|---|
| `predict` | raster + model -> raster | Run model inference on input imagery |
| `predict_batch` | raster + model + region -> raster | Batch inference over a large region (tiled) |
| `compute_embeddings` | raster -> raster | Generate embeddings from a foundation model encoder |
| `chip` | raster + labels -> raster chips | Cut imagery into fixed-size patches for ML training |
| `evaluate` | raster + raster -> table | Compute metrics (mIoU, accuracy, per-class F1) against ground truth |
| `distill` | model + raster -> model | Task-specific knowledge distillation (teacher -> student) |
| `linear_probe` | embeddings + labels -> model | Train lightweight classifier on cached embeddings |

### Data Preparation Pipeline

The primary gap both InstaGeo and the GeoML library survey identify: going from raw satellite imagery to training-ready chips. Expressed as a folia pipeline:

```yaml
layers:
  source/imagery:
    type: raster
    source:
      connector: stac
      params:
        catalog: https://cmr.earthdata.nasa.gov/stac
        collection: HLSL30.v2.0
        temporal: 2024-01-01/2024-12-31

  prepare/filtered:
    type: raster
    compute:
      op: cloud_filter
      inputs:
        imagery: { layer: source/imagery }
      params:
        max_cloud_cover: 0.2

  prepare/chips:
    type: raster
    compute:
      op: chip
      inputs:
        imagery: { layer: prepare/filtered }
      params:
        size: 224
        stride: 112
        temporal_steps: 6
        min_valid_fraction: 0.8
```

## Compute

ML operations run across three backends, selected automatically by model format:

| Backend | Operations | Use Case |
|---|---|---|
| **onnxruntime** | predict, predict_batch | Primary inference backend. Runs ONNX models on CPU, CUDA, CoreML. |
| **torchgeo** | predict, compute_embeddings, distill, linear_probe | Operations requiring PyTorch (gradients, embedding extraction). |
| **sklearn** | evaluate, confusion_matrix, linear_probe | Lightweight eval metrics. No GPU needed. |

### Backend Resolution

```
predict op ->
  model format is ONNX         -> onnxruntime
  model format is torchscript   -> torchgeo
  explicit backend: override    -> use that
  no model format metadata      -> error
```

ONNX is the preferred interchange format: it decouples training framework from inference runtime, runs on CPU/CUDA/CoreML/DirectML, and has a smaller runtime dependency than full PyTorch.

### Local-First Inference

The same `predict` operation runs locally or in cloud batch. The distillation bridge makes this practical:

| Tier | Model | Latency |
|---|---|---|
| **Workbench / local** | Distilled model (46M params, ONNX) | Seconds, interactive |
| **Cloud batch** | Full model (389M params) | Hours, high quality |

Model layers declare `runtime_hints` that inform scheduling:

```yaml
ml:
  format: onnx
  param_count: 16_000_000
  runtime_hints:
    min_memory: 2Gi
    gpu_preferred: false
    batch_latency: 200ms
```

## Positioning

### What folia does and doesn't do

| Folia does | Folia doesn't |
|---|---|
| Prepare training data (STAC -> chips with labels) | Train models from scratch |
| Run inference with pretrained/fine-tuned models | Hyperparameter search |
| Store models as versioned artifacts with provenance | Host training infrastructure |
| Compress models via distillation for local inference | Compete with MLflow or W&B |
| Compute and cache embeddings from foundation models | Build foundation models |
| Evaluate predictions against ground truth | Research novel architectures |

### Where folia sits

```
Research / Training (TorchGeo, InstaGeo, TerraTorch)
        |  model weights, ONNX exports
        v
Folia ML Domain (data prep, inference, artifacts)
        |  predictions, embeddings
        v
Serving / Workbench (tiles, maps, charts)
```

## Model and Data Cards

Published model and embedding artifacts can include structured metadata cards for interoperability with HuggingFace Hub and the geospatial ML community. See [Cards](/catalog/cards) for the model card and data card specifications.

## Example: End-to-End Crop Mapping

```yaml
layers:
  # 1. Source imagery
  imagery/hls-iowa:
    type: raster
    source:
      connector: stac
      params:
        catalog: https://cmr.earthdata.nasa.gov/stac
        collection: HLSL30.v2.0
        bbox: [-96.6, 40.4, -90.1, 43.5]
        temporal: 2025-06-01/2025-09-30
    geo:
      bbox: [-96.6, 40.4, -90.1, 43.5]

  # 2. Run inference
  predictions/crop-type:
    type: raster
    compute:
      op: predict
      inputs:
        imagery: { layer: imagery/hls-iowa }
      params:
        model: catalog://models/crop-segmentation-sentinel2@v3
    ml:
      model_ref: catalog://models/crop-segmentation-sentinel2@v3
      task: segmentation
    style:
      palette: categorical
      legend: true

  # 3. Evaluate
  evaluation/accuracy:
    type: table
    compute:
      op: evaluate
      inputs:
        predictions: { layer: predictions/crop-type }
        ground_truth: { layer: labels/cdl-iowa-2025 }
      params:
        task: segmentation
    style:
      table:
        columns:
          - { field: metric, label: Metric }
          - { field: value, label: Value, format: ".3f" }
```
