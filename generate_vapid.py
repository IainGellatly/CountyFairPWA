from pywebpush import webpush, WebPushException
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization

private_key = ec.generate_private_key(ec.SECP256R1())
public_key = private_key.public_key()

print("PRIVATE KEY:")
print(private_key.private_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PrivateFormat.PKCS8,
    encryption_algorithm=serialization.NoEncryption()
).decode())

print("PUBLIC KEY:")
print(public_key.public_bytes(
    encoding=serialization.Encoding.X962,
    format=serialization.PublicFormat.UncompressedPoint
).hex())