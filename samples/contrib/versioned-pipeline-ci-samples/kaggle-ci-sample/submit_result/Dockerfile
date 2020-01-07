FROM python:3.7
ENV KAGGLE_USERNAME=["jingzhang36"] \
    KAGGLE_KEY=["7d5a0b4cc7b6c5304e9e1afd2f8c69ed"]
RUN pip install kaggle
RUN pip install gcsfs
COPY ./submit_result.py .
CMD ["python", "submit_result.py"]
