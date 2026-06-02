# pre-requisite
1. Nodejs:v18+
2. Docker:v29.4.3

# clone 
```
git clone https://github.com/mediraksha10-maker/mediraksha2.0.git
cd mediraksha2.0
```

# database setup via docker
```
docker run -d \
  --name mediraksha \
  -e POSTGRES_USER=<username> \
  -e POSTGRES_PASSWORD=<password> \
  -e POSTGRES_DB=<dbname> \
  -p 5433:5432 \
  -v pgdata_alt:/var/lib/postgresql/data \ 
  postgres:16
```
```
docker exec -it mediraksha psql -U <username> -d <dbname>
```
# run the queries which is inside ./design/db.sql file
# db url will be postgresql://<username>:<password>@localhost:5433/<dbname> to connect

# environment variables
```
# add .env in both backend and frontend
```

# building dependencies
```
npm run build
```

# running the app
```
npm start
```