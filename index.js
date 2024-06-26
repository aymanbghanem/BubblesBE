require('dotenv').config()
const cors = require('cors')
const express = require('express')
const connectDB = require('./src/database/db')
const swaggerJSDoc = require('swagger-jsdoc')
const swaggerUI = require('swagger-ui-express')
const loginRouter = require('./src/router/login.router')
const userRouter = require('./src/router/user.router')
const companyRouter = require('./src/router/company.router')
const departmentRouter = require('./src/router/department.router')
const surveyRouter = require('./src/router/survey.router')
const questionRouter = require('./src/router/question.router')
const locationRouter = require('./src/router/location.router')
const imageRouter = require('./src/router/image.router')
const settingRouter = require('./src/router/setting.router')
const responseRouter = require('./src/router/response.router')
const questionControllerRouter = require('./src/router/questions_controller.router')
const notifyRouter = require('./src/router/notify.router')
const urlRouter = require('./src/router/url.router')
const reportsRouter = require('./src/router/reports.router')
const notificationRouter = require('./src/router/notification.router')
const contactRouter = require('./src/router/contactus.router')
const Setting = require('./src/models/setting.models');
const QuestionController = require('./src/models/questions_controller.models');

const app = express()
app.use(cors())
app.use(express.static("logo"));
app.use(express.static("answersImage"));
app.use(express.static("report"));
app.use(express.json());


const port = parseInt(process.env.PORT)
connectDB()

app.use(userRouter)
app.use(loginRouter)
app.use(companyRouter)
app.use(departmentRouter)
app.use(surveyRouter)
app.use(questionRouter)
app.use(locationRouter)
app.use(imageRouter)
app.use(settingRouter)
app.use(responseRouter)
app.use(questionControllerRouter)
app.use(notifyRouter)
app.use(urlRouter)
app.use(reportsRouter)
app.use(notificationRouter)
app.use(contactRouter)


Setting.initializeSettings();
QuestionController.initializeQuestionTypes()
app.get('/', (req, res) => res.send('Hello World!'))
app.listen(port, () => console.log(`Example app listening on port ${port}!`))