"""
step #1: download data from kaggle website, and push it to gs bucket
"""

def processAndUpload(
    bucket_name
):
    from google.cloud import storage
    storage_client = storage.Client()
    bucket = storage_client.get_bucket('jingzhangjz-project-outputs')
    train_blob = bucket.blob('train.csv')
    test_blob = bucket.blob('test.csv')
    train_blob.upload_from_filename('train.csv')
    test_blob.upload_from_filename('test.csv')

    with open('train.txt', 'w') as f:
        f.write('gs://jingzhangjz-project-outputs/train.csv')
    with open('test.txt', 'w') as f:
        f.write('gs://jingzhangjz-project-outputs/test.csv')

if __name__ == '__main__':
    import os
    os.system("kaggle competitions download -c house-prices-advanced-regression-techniques")
    os.system("unzip house-prices-advanced-regression-techniques")
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--bucket_name', type=str)
    args = parser.parse_args()

    processAndUpload('jingzhangjz-project-outputs')
