FROM python:3.7
ENV KAGGLE_USERNAME=jingzhang36 \
    KAGGLE_KEY=a58401f7f87100d780364e124401ef03
RUN pip install kaggle
RUN pip install gcsfs
COPY ./submit_result.py .
CMD ["python", "submit_result.py"]