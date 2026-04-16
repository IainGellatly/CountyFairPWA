from py_vapid import Vapid

v = Vapid()
v.generate_keys()

public_key = v.public_key
private_key = v.private_key

print("PUBLIC:\n", public_key)
print("\nPRIVATE:\n", private_key)