const jwt = require('jsonwebtoken')
const { User } = require('../models')

const JWT_KEY = "MuSecretHz"

module.exports = (req, res, next) => {
    try {
        const token = req.headers.authorization.split(" ")[1]
        console.log("token: ", token)
        const decoded = jwt.verify(token, JWT_KEY)
        req.userData = decoded
        console.log("decode: ", decoded.email)
        User.findOne({ where: {email: decoded.email}})
            .then(user => {
                    console.log("dfjvh")
                res.locals.user = user
                next()
            })
            .catch(err=>{
                console.log(err)
                res.status(401)
            })
    } catch (error) {
        return res.status(401).json({})
    }
}