#!/bin/bash
# curl -H "Content-Type: application/json" -X GET http://35.192.214.113:8888/apis/v1beta1/pipeline_versions/7d37c72a-9e5f-4c59-9afc-7ca203552fb8

data='{"name":'\""$1"\"', "code_source_url": "https://github.com/kubeflow/pipelines/tree/'"$1"'", "package_url": {"pipeline_url": "https://storage.googleapis.com/jingzhangjz-kfp/'"$1"'/pipeline.zip"}, "resource_references": [{"key": {"id": '\""$2"\"', "type":3}, "relationship":1}]}'
# data='{"name":'\""ci-$1"\"', "package_url": {"pipeline_url": "https://storage.googleapis.com/jingzhangjz-kfp/pipeline.zip"}, "resource_references": [{"key": {"id": '\""$2"\"', "type":3}, "relationship":1}]}'
version=$(curl -H "Content-Type: application/json" -X POST -d "$data" http://35.192.214.113:8888/apis/v1beta1/pipeline_versions | jq -r ".id")
echo "$version"

# create run
rundata='{"name":'\""$1-run"\"', "resource_references": [{"key": {"id": '\""$version"\"', "type":4}, "relationship":2}, {"key": {"id": "52e9cbbd-1670-4486-967f-ff1577f3f9b1", "type":1}, "relationship": 1}]}'
echo "$rundata"
curl -H "Content-Type: application/json" -X POST -d "$rundata" http://35.192.214.113:8888/apis/v1beta1/runs