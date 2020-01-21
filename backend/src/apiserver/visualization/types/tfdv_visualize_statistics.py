import tensorflow_data_validation as tfdv
stats = tfdv.load_statistics('gs://jingzhangjz-project-outputs/tfx_taxi_simple/e9582623-bded-44d6-8cad-f5e1c3ac0417/StatisticsGen/output/62/eval/stats_tfrecord')
tfdv.visualize_statistics(stats)