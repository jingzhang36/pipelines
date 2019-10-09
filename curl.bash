#!/bin/bash
# curl -H "Content-Type: application/json" -X GET http://35.192.214.113:8888/apis/v1beta1/pipeline_versions/7d37c72a-9e5f-4c59-9afc-7ca203552fb8
data='{"name":'\""$1"\"', "package_url": {"pipeline_url": "https://storage.googleapis.com/jingzhangjz-kfp/'"$1"'/pipeline.zip"}, "resource_references": [{"key": {"id": '\""$2"\"', "type":3}, "relationship":1}]}'
curl -H "Content-Type: application/json" -X POST -d "$data" http://35.192.214.113:8888/apis/v1beta1/pipeline_versions