test_file = "backend/tests/test_maintenance_endpoints.py"
with open(test_file, "r") as f:
    content = f.read()

content = content.replace('"/stores"', '"/infrastructure/stores"')
content = content.replace('"/equipment"', '"/infrastructure/equipment"')

with open(test_file, "w") as f:
    f.write(content)

