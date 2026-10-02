package bd.dhaka.dars.service;

/** Binary blob storage. The local-disk implementation can be swapped for S3/MinIO. */
public interface StorageService {

    void put(String key, byte[] content);

    byte[] get(String key);
}
