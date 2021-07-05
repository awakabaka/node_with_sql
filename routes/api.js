const express = require('express');
const router = express.Router();
const fs = require('fs')
const multer = require('multer')
const jwt = require('jsonwebtoken')
const check_auth = require('../middleware/check_auth')

const { User, Item } = require('../models');

const JWT_KEY = "MuSecretHz";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads');
    },
    filename: function (req, file, cb) {
        cb(null, new Date().getTime() + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: {fileSize: 1024 * 1024 * 5}
});

router.get('/login', async function (req, res, next) {
    let user = await User.findOne({ where: {email: req.body.email, password: req.body.password}})
    if(!user) {
        res.status(422)
        return res.json({
            field: "password",
            message: "Wrong email or password"
        })
    }
else
    {
        const token = jwt.sign(
            {
                email: req.body.email
            },
            JWT_KEY,
            {
                expiresIn: "1h"
            }
        );
        console.log("token: ", token, "email: ", user.email, "password: ", user.password)
        return res.status(200).json({
            token: token
        });
    }
})

//it`s work
router.post('/register',  async function (req, res, next){
    const user = ({
         name: req.body.name,
         email: req.body.email,
         password: req.body.password,
         phone: req.body.phone
    })
    if (req.body.password.length <= 6){
        res.status(422)
        return res.json({
            field: req.body.password,
            message: "Wrong current or password"
        })    } else {
        let newUser = await User.create(user)
        if (newUser){
        const token = jwt.sign(
            {
                email: req.body.email,
            },
            JWT_KEY,
            {
                expiresIn: "1h"
            }
        );
        console.log("token: ", token, "email: ", user.email, "password: ", user.password)
        return res.status(200).json({
            token: token
        });
        }
    }

})

//it`s work
router.get('/me', check_auth, function(req, res, next) {
    res.status(200).json(res.locals.user)
});

//it`s works
router.get('/items', function(req, res, next) {
    Item.findAll({
        include: [{
            model: User,
            attributes: [
                'id',
                'name',
                'email',
                'phone'
            ],
        }]
    })
        .then( items => res.json(items) )
        .catch(err => {
            res.status(500).send({ message: err.message });
        })
});

router.get('/items/:itemId', check_auth, function(req, res, next) {
    const id = req.params.itemId
    Item.findByPk(id,{
        include: [{
            model: User,
            attributes: [
                'id',
                'name',
                'email',
                'phone'
            ],
        }]
    })
        .then( items => {
            if (items) {
                res.status(200).json(items)}
            else {
                res.status(404).json({})
            }
            })
        .catch(err => {
            res.status(500).send({ message: err.message });
        })
});

router.put('/items/:id', check_auth, async function (req, res, next) {
    const email = res.locals.user.email
    let user = await User.findOne({ where: {email: email}})
    let item = await Item.findOne({where: {id: req.params.id}})
    if (!item) return  res.status(404).json({})
    if (user.id != item.user_id) { return res.status(403).json({}) }
    if (req.body.title && req.body.title.length < 3) return res.status(422).json({
            field: "title",
            message: "Title should contain at least 3 characters"
        })
        let params = ['title', 'price'].reduce((r, x) => {
            if (x in req.body) {
                r[x] = req.body[x];
            }
            return r;
        }, {});
        if (!Object.keys(params).length) { return res.status(403).json({}) }
           try {
               await item.update(params)
               let result = await Item.findByPk(item.id, {
                       include: [{
                           model: User,
                           attributes: [
                               'id',
                               'name',
                               'email',
                               'phone'
                           ],
                       }]
                   })
               res.status(200).json(result)
           }
            catch(err) {
                       res.status(500)
                console.log(err)
           }
})

router.delete('/items/:id', check_auth, async function (req, res, next) {
    const id = req.params.id;
    let user = await User.findOne({where: {email: res.locals.user.email}})
    let item = await Item.findOne({where: {id: req.params.id}}) //пользователь может удалить только свой товар
    if (!item) return res.status(404).json({})
    if (user.id != item.user_id) return res.status(403).json({})

    try {
        item = await Item.destroy({where: {id: id}})
            if (item == 1) return res.status(200).json({})
    }
        catch(err) {
            res.status(500)
            console.log(err)
        }
})

router.post('/items', check_auth, async function (req, res, next){
    if (!req.body.title) return res.status(422).json({
        "field": "title",
        "message": "Title is required"
    })
    if (!req.body.price) return res.status(422).json({
        "field": "price",
        "message": "Price is required"
    })
    const item = ({
        created_at: Date.now(),
        title: req.body.title,
        price: req.body.price,
        user_id: res.locals.user.id
    })
      try {
          let result = await Item.create(item)
          let items = await Item.findByPk(result.id, {
              include: [{
                          model: User,
                          attributes: [
                              'id',
                              'name',
                              'email',
                              'phone'
                          ],
                      }]
                  })
          if (items) return res.status(200).json(items)
      }
    catch(err) {
        console.log(err)
        res.status(500)
    }
})

//область видимости переменной
router.post('/items/:id/image', check_auth, upload.single('image'), async function (req, res, next){
    const id = req.params.id;
    let file = req.file ? req.file.path : null
    let result = await Item.findByPk(id)
        if (!result) return res.status(404).json({})
    console.log(result.user_id, " ", res.locals.user.id)
    if (!file) {
        return res.status(404).json({})
    }
    try {
        if (result.user_id != res.locals.user.id)
        {
            return res.status(403).json({})
        } else {
            await Item.update({image: file}, {
                where: {id: id}
            })
            return res.status(200).json({})
        }
    }
    catch(err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(422).json({
                "field": "image",
                "message": 'The file is too big'
            })
        } else {
            res.status(500).send(err)
        }
    }
})

module.exports = router;
