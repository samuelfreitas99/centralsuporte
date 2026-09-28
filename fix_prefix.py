import re

# Fix frontend
ts_file = "frontend/src/services/infrastructureService.ts"
with open(ts_file, "r") as f:
    content = f.read()

content = content.replace("'/stores", "'/infrastructure/stores")
content = content.replace("`/stores", "`/infrastructure/stores")

content = content.replace("'/departments", "'/infrastructure/departments")
content = content.replace("`/departments", "`/infrastructure/departments")

content = content.replace("'/locations", "'/infrastructure/locations")
content = content.replace("`/locations", "`/infrastructure/locations")

content = content.replace("'/licenses", "'/infrastructure/licenses")
content = content.replace("`/licenses", "`/infrastructure/licenses")

content = content.replace("'/stock", "'/infrastructure/stock")
content = content.replace("`/stock", "`/infrastructure/stock")

with open(ts_file, "w") as f:
    f.write(content)


# Fix tests
test_file = "backend/tests/test_infrastructure_endpoints.py"
with open(test_file, "r") as f:
    content = f.read()

content = content.replace('"/stores', '"/infrastructure/stores')
content = content.replace('"/departments', '"/infrastructure/departments')
content = content.replace('"/locations', '"/infrastructure/locations')
content = content.replace('"/equipment', '"/infrastructure/equipment')
content = content.replace('"/licenses', '"/infrastructure/licenses')
content = content.replace('"/stock', '"/infrastructure/stock')

with open(test_file, "w") as f:
    f.write(content)

