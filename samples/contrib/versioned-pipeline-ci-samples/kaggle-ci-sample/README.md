# Kaggle Competition Pipeline Sample

## Pipeline Overview

This is a pipeline sample for [house price prediction](https://www.kaggle.com/c/house-prices-advanced-regression-techniques), an entry-level competition in kaggle. This pipeline consists of downloading data, preprocessing and visualizing data, training model and submitting results to kaggle website.

* We refer to [the work by Raj Kumar Gupta](https://www.kaggle.com/rajgupta5/house-price-prediction) and [the work by Sergei Neviadomski](https://www.kaggle.com/neviadomski/how-to-get-to-top-25-with-simple-model-sklearn) for the model implementation and data visualization used in this sample pipeline.

* We use [Kaggle python API](https://github.com/Kaggle/kaggle-api) to interact with Kaggle site, such as downloading data and submiting result.

* We use [Google Cloud Build service](https://cloud.google.com/cloud-build/) to orchestrate the continuous integration process.

## Prerequesites

To run this sample, we need the following resources:
* Kaggle account
* Google Cloud Build Service
* GKE Cluster
* KFP deployment on GKE cluster

## Usage

* Substitute the constants in cloudbuild.yaml
* Fill in your kaggle_username and kaggle_key in download_dataset/Dockerfile and submit_result/Dockerfile to authenticate when interacting with Kaggle. They are Kaggle API token and you can get them by following these [instructions](https://www.kaggle.com/docs/api#authentication) on Kaggle website.
* Change the images in pipeline.py to the ones you built in cloudbuild.yaml
* Set up a Cloud Build trigger as [instructed](https://cloud.google.com/cloud-build/docs/running-builds/create-manage-triggers). One way to do it is
    * Event: choose "Push to a branch"
    * Source: your repo storing this pipeline example
    * Branch: your changes to this pipeline example
    * Build configuration: choose "Cloud Build configuration file" and use the file cloudbuild.yaml
