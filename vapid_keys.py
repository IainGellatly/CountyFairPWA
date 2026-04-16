from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization
from base64 import urlsafe_b64encode

# Generate key pair
private_key = ec.generate_private_key(ec.SECP256R1())
public_key = private_key.public_key()

# Convert PUBLIC key to Web Push format (THIS is what browser needs)
public_bytes = public_key.public_bytes(
    encoding=serialization.Encoding.X962,
    format=serialization.PublicFormat.UncompressedPoint
)

public_b64 = urlsafe_b64encode(public_bytes).decode().rstrip("=")

# Convert PRIVATE key to usable format for pywebpush
private_bytes = private_key.private_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PrivateFormat.PKCS8,
    encryption_algorithm=serialization.NoEncryption()
)

print("\nPUBLIC KEY:\n")
print(public_b64)

print("\nPRIVATE KEY:\n")
print(private_bytes.decode())