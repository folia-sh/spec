# Model & Data Cards

Structured metadata cards for published models and datasets. Cards make artifacts discoverable, reproducible, and interoperable with HuggingFace Hub and the broader geospatial ML community.

Cards are not a separate system  - they are a **view** of existing artifact metadata (provenance, `ml:` schema, `geo:` extent) formatted for human consumption and platform interop.

## Why Cards

| Problem | What cards solve |
|---|---|
| "Can I use this model on my data?" | Intended use, input requirements, geographic/temporal validity |
| "How well does it perform?" | Structured evaluation results with dataset and methodology |
| "What are the known limitations?" | Explicit out-of-distribution warnings, bias assessment |
| "Where did this dataset come from?" | Collection process, source products, processing steps |
| "Is this compatible with my model?" | Embedding properties, grid spacing, band alignment |

## Model Cards

A model card describes a trained model artifact. Based on the [geo-embeddings model card](https://geoembeddings.org/model-card.html) specification, extended with folia provenance.

### Schema

The `card:` block is optional on model layers:

```yaml
layers:
  models/crop-segmentation:
    type: model
    uri: catalog://models/crop-segmentation-sentinel2@v3

    ml:
      task: segmentation
      architecture: unet
      foundation_model: prithvi-100m
      format: onnx
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

    card:
      description: >
        Crop type segmentation model for European agriculture,
        fine-tuned from Prithvi-100M on HLS imagery.
      intended_use: Regional crop mapping from Harmonized Landsat Sentinel imagery
      limitations:
        - Trained on European crops only  - not validated for tropical agriculture
        - Requires 6+ cloud-free observations per growing season
        - Accuracy degrades below 60% for fields smaller than 0.5 ha
      license: Apache-2.0
      citation: "doi:10.1234/crop-seg-2024"
      provider: NASA IMPACT
      funder: NASA

    geo:
      bbox: [-10.0, 35.0, 30.0, 60.0]
    temporal:
      range: [2024-01-01, 2024-12-31]
```

### Card Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `description` | string | Yes | Free-text explanation of the model |
| `intended_use` | string | Yes | What the model is designed for |
| `limitations` | list | No | Known constraints, failure modes, geographic/temporal bounds |
| `license` | string | Yes | SPDX license identifier |
| `citation` | string | No | DOI or citation string |
| `provider` | string | Yes | Organization or individual that developed the model |
| `funder` | string | No | Funding institution(s) |
| `cautions` | list | No | Warnings for users (e.g., "not trained on snow cover") |

### Embedding Properties

For foundation models and embedding-producing models, additional fields align with the [geo-embeddings](https://geoembeddings.org/model-card.html) specification:

| Field | Type | Description | Values |
|---|---|---|---|
| `embedding_spatial_types` | list | Spatial type of embeddings | `pixel`, `patch`, `scene` |
| `embedding_temporal_type` | list | Temporal type of embeddings | `single-date`, `multi-date` |
| `embedding_spatial_context` | string | Whether spatial context extends beyond the embedding unit | free text |
| `embedding_temporal_context` | string | Whether temporal context extends beyond the embedding unit | free text |

```yaml
layers:
  models/clay-v1:
    type: model
    uri: huggingface://made-with-clay/Clay

    ml:
      task: embedding
      architecture: vit
      embedding_dim: 768
      format: safetensors

    card:
      description: >
        Clay Foundation Model v1. A vision transformer pre-trained
        on global Sentinel-2 imagery using masked image modeling.
      intended_use: General-purpose geospatial embedding extraction
      limitations:
        - Pre-trained on Sentinel-2 L2A only
        - Single-date embeddings (no temporal stacking)
      license: Apache-2.0
      provider: Clay
      embedding_spatial_types: [patch]
      embedding_temporal_type: [single-date]
      embedding_spatial_context: "spatial context beyond embedding spatial type"
      embedding_temporal_context: "temporal context determined by embedding temporal type"
```

### Pretraining Metadata

For models where training details are known:

| Field | Type | Description |
|---|---|---|
| `pretraining.data_types` | list | Data types used: `multispectral`, `SAR`, `RGB`, `DEM`, etc. |
| `pretraining.product_names` | list | Source data products (e.g., `sentinel-2-l2a`) |
| `pretraining.training_strategy` | string | Training approach: `MIM`, `Contrastive`, `Supervised`, etc. |
| `pretraining.spatial_extent` | bbox | Geographic extent of training data |
| `pretraining.temporal_extent` | range | Temporal extent of training data |
| `pretraining.patch_size` | integer | Input patch size in pixels |

```yaml
    card:
      # ...
      pretraining:
        data_types: [multispectral]
        product_names: [sentinel-2-l2a]
        training_strategy: MIM
        spatial_extent: [-180, -90, 180, 90]
        temporal_extent: [2017-01-01, 2023-12-31]
        patch_size: 224
```

### Evaluation Results

Structured evaluation results per downstream task, following the HuggingFace `model-index` pattern:

```yaml
    card:
      # ...
      evaluations:
        - task: crop field segmentation
          dataset: PASTIS
          split: test
          metrics:
            - { type: miou, value: 0.61 }
            - { type: accuracy, value: 0.83 }
            - { type: f1, value: 0.72 }
          source: "https://arxiv.org/abs/..."
```

| Field | Type | Required | Description |
|---|---|---|---|
| `evaluations[].task` | string | Yes | Downstream task name |
| `evaluations[].dataset` | string | Yes | Evaluation dataset name |
| `evaluations[].split` | string | No | Dataset split (e.g., `test`, `val`) |
| `evaluations[].metrics` | list | Yes | Metric type/value pairs |
| `evaluations[].source` | string | No | Link to evaluation methodology or paper |

## Data Cards

A data card describes a published dataset or embedding dataset. Based on the [geo-embeddings data card](https://geoembeddings.org/data-card.html) specification.

### Schema

```yaml
layers:
  embeddings/clay-conus-2024:
    type: raster
    uri: catalog://embeddings/clay-conus-2024@v1

    ml:
      task: embedding
      foundation_model: clay-v1
      embedding_dim: 768

    card:
      description: >
        Pre-computed Clay v1 embeddings covering the contiguous US,
        derived from Sentinel-2 L2A imagery at 10m resolution.
      license: CC-BY-4.0
      creator: folia
      intended_use: >
        Linear probing, nearest-neighbor search, and downstream
        classification without re-running the foundation model.
      limitations:
        - Single-date composites (monthly median)  - no intra-month variation
        - Cloud-masked gaps in Pacific Northwest winter months

      source_data:
        products: [sentinel-2-l2a]
        model_name: Clay-v1
        model_link: "https://huggingface.co/made-with-clay/Clay"

      grid_spacing: [10, 10]
      postprocessing: null
      quantization: null

    geo:
      bbox: [-125, 24, -66, 50]
    temporal:
      range: [2024-01-01, 2024-12-31]
```

### Card Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `description` | string | Yes | What this dataset contains |
| `license` | string | Yes | SPDX license identifier |
| `creator` | string | Yes | Organization or individual that created the dataset |
| `funder` | string | No | Funding institution(s) |
| `intended_use` | string | No | How this dataset is meant to be used |
| `limitations` | list | No | Known gaps, coverage issues, quality caveats |
| `citation` | string | No | DOI or citation string |

### Source Information

For datasets derived from other data (embeddings, composites, predictions):

| Field | Type | Required | Description |
|---|---|---|---|
| `source_data.products` | list | Yes | Source data products used |
| `source_data.model_name` | string | Cond. | Model used to generate (for embeddings) |
| `source_data.model_link` | string | Cond. | URL to the model card |

### Processing Details

| Field | Type | Description |
|---|---|---|
| `grid_spacing` | `[x, y]` | Output footprint size in meters |
| `postprocessing` | string | Any post-generation processing (smoothing, gap-filling, etc.) |
| `quantization` | string | Quantization applied to values (e.g., `int8`), or `null` |

### Dataset Statistics

```yaml
    card:
      # ...
      statistics:
        features:
          - { name: embedding, dtype: float32, shape: [768] }
          - { name: h3_index, dtype: string }
          - { name: timestamp, dtype: datetime }
        record_count: 14_200_000
        download_size: 42GB
        spatial_coverage: 0.87    # fraction of AOI with valid data
```

## HuggingFace Interop

`folia publish` can generate HuggingFace-compatible model and data card YAML from the `card:` block. This maps folia's richer provenance model onto the HF frontmatter format.

| folia field | HF model card field |
|---|---|
| `card.license` | `license` |
| `card.provider` | `provider` |
| `card.description` | `description` |
| `ml.architecture` | `model_architecture` |
| `ml.embedding_dim` | `embedding_dimension` |
| `card.embedding_spatial_types` | `embedding_spatial_types` |
| `card.evaluations` | `model-index` |
| `card.pretraining` | `pretraining` |
| `geo.bbox` | `pretraining.spatial_extent` |
| `temporal.range` | `pretraining.temporal_extent` |

For data cards:

| folia field | HF data card field |
|---|---|
| `card.creator` | `creator` |
| `card.source_data.products` | `inference_datasets` |
| `card.source_data.model_name` | `model_name` |
| `card.grid_spacing` | `grid_spacing` |
| `card.quantization` | `quantization` |

The full [geo-embeddings](https://geoembeddings.org) specification defines the canonical field names and acceptable values for geospatial foundation model metadata on HuggingFace Hub.

## Relationship to Provenance

Cards complement folia's provenance chain  - they don't replace it. Provenance tracks the full computational lineage (source data -> operations -> output). Cards summarize the **human-relevant context** that provenance alone doesn't capture: intended use, known limitations, ethical considerations.

```
Provenance: source imagery -> cloud_filter -> chip -> train -> model
Card:       "This model is for European crop mapping. Don't use it in the tropics."
```

Both are attached to the same artifact in the catalog.
