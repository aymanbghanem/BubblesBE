require('dotenv').config()
const cors = require('cors')
const express = require('express')
const connectDB = require('./src/database/db')
const loginRouter = require('./src/router/login.router')
const userRouter = require('./src/router/user.router')
const companyRouter = require('./src/router/company.router')
const departmentRouter = require('./src/router/department.router')
const surveyRouter = require('./src/router/survey.router')
const questionRouter = require('./src/router/question.router')
const app = express()
app.use(cors())
app.use(express.static("logo"));
app.use(express.json());


const port = parseInt(process.env.PORT)
connectDB()

app.use(userRouter)
app.use(loginRouter)
app.use(companyRouter)
app.use(departmentRouter)
app.use(surveyRouter)
app.use(questionRouter)
app.get('/', (req, res) => res.send('Hello World!'))
app.listen(port, () => console.log(`Example app listening on port ${port}!`))