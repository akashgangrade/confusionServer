// connect to Express Server
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const authenticate = require('../authenticate');

const Dishes = require('../models/dishes');

const dishRouter = express.Router();

dishRouter.use(bodyParser.json());


dishRouter.route('/')  
.get((req, res, next) => {
    Dishes.find({})  
    .populate('comments.author')
    .then((dishes) => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json'); 
        res.json(dishes); 
    }, (err) => next(err))
    .catch((err) => next(err));
})
.post(authenticate.verifyUser, authenticate.verifyAdmin,(req, res, next) => {
    Dishes.create(req.body)
    .then((dish) => {
        console.log('Dish Created', dish);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(dish);
    }, (err) => next(err))
    .catch((err) => next(err));
})
.put(authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
    res.statusCode = 403; 
    res.end('PUT operation not supported on /dishes');
})
.delete(authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => { 
    Dishes.remove({})
    .then((resp) => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(resp);
    }, (err) => next(err))
    .catch((err) => next(err));
});

//////
// For route of /:dishId
dishRouter.route('/:dishId')
.get( (req,res,next) => {
    Dishes.findById(req.params.dishId)
    .populate('comments.author')
    .then((dish) => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(dish);
    }, (err) => next(err))
    .catch((err) => next(err));
})
.post(authenticate.verifyUser,authenticate.verifyAdmin, (req, res, next) => {
  res.statusCode = 403;
  res.end('POST operation not supported on /dishes/'+ req.params.dishId);
})
.put(authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
    Dishes.findByIdAndUpdate(req.params.dishId, {
        $set: req.body
    }, {new: true})
    .then((dish) => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(dish);
    }, (err) => next(err))
    .catch((err) => next(err));
})
.delete(authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
    Dishes.findByIdAndRemove(req.params.dishId)
    .then((resp) => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(resp);
    }, (err) => next(err))
    .catch((err) => next(err));
});

////////////
// For /comments and /commentsId
dishRouter.route('/:dishId/comments')  
.get((req, res, next) => {
    Dishes.findById(req.params.dishId)  // send to the mongodb server using a mongoose methed
    .populate('comments.author')
    .then((dish) => {
        if(dish != null){
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.json(dish.comments);  // return the comments
        }
        else{ // dish not exist
            err = new Error('Dish' + req.params.dishId + ' not found');
            err.status = 404;
            return next(err); // we're just going to return that error here from the get operation
        }
    }, (err) => next(err))
    .catch((err) => next(err));
})
.post(authenticate.verifyUser, (req, res, next) => { // update comments
    Dishes.findById(req.params.dishId)
    .then((dish) => {
        if(dish != null){
            req.body.author = req.user._id; // save _id to author and save
            // Before pass back the value
            dish.comments.push(req.body);
            dish.save() // save the collection 
            .then((dish) => {
                Dishes.findById(dish._id) // find a certain dish and populate comments.author
                .populate('comments.author')
                .then((dish) => {
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.json(dish);  // returning the updated dish back to the user here.
                });
            }, (err) => next(err));
        }
        else{ // dish not exist
            err = new Error('Dish' + req.params.dishId + ' not found');
            err.status = 404;
            return next(err); // we're just going to return that error here from the get operation
        }
    }, (err) => next(err))
    .catch((err) => next(err));
})
.put(authenticate.verifyUser, (req, res, next) => {
    res.statusCode = 403; // 403 means their  operation not supported
    res.end('PUT operation not supported on /dishes'
        + req.params.dishId + '/comments');
})
.delete(authenticate.verifyUser,authenticate.verifyAdmin, (req, res, next) => { // Later on, we will learn how to use authentication
    Dishes.findById(req.params.dishId)
    .then((dish) => { // resp, Server response
        if(dish != null){
           
            for(var i = (dish.comments.length -1); i >=0; i--){ 
                dish.comments.id(dish.comments[i]._id).remove();
            }
            dish.save() // save the collection 
            .then((dish) => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(dish);  // returning the updated dish back to the user here.
            }, (err) => next(err));
        }
        else{ // dish not exist
            err = new Error('Dish' + req.params.dishId + ' not found');
            err.status = 404;
            return next(err); // we're just going to return that error here from the get operation
        }
    }, (err) => next(err))
    .catch((err) => next(err));
});

// For route of /:dishId/comments/:commentId
dishRouter.route('/:dishId/comments/:commentId')
.get( (req,res,next) => {
    Dishes.findById(req.params.dishId)
    .populate('comments.author')
    .then((dish) => {
        if(dish != null && dish.comments.id(req.params.commentId) != null){
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.json(dish.comments.id(req.params.commentId));  // return the comments
        }
        else if (dish == null){ // dish not exist
            err = new Error('Dish' + req.params.dishId + ' not found');
            err.status = 404;
            return next(err); // we're just going to return that error here from the get operation
        }
        else{ // commentID doesn't exist
            err = new Error('Comment ' + req.params.commentId + ' not found');
            err.status = 404;
            return next(err);
            }
    }, (err) => next(err))
    .catch((err) => next(err));
})
.post(authenticate.verifyUser,(req, res, next) => {
  res.statusCode = 403;
  res.end('POST operation not supported on /dishes/'+ req.params.dishId 
        + '/comments/' + req.params.commentId);
})
.put(authenticate.verifyUser, (req, res, next) => {
    Dishes.findById(req.params.dishId)
    .then((dish) => {
        if(dish != null && dish.comments.id(req.params.commentId) != null){

            if(req.body.rating){
                dish.comments.id(req.params.commentId).rating = req.body.rating;
            }
            if(req.body.comment){
                dish.comments.id(req.params.commentId).comment = req.body.comment;
            }
            dish.save() // save the collection 
            .then((dish) => {
                Dishes.findById(dish._id)
                .populate('comments.author')
                .then((dish) => {
                    res.statusCode = 200;  // res for sending back the reply
                res.setHeader('Content-Type', 'application/json');
                res.json(dish);  // returning the updated dish back to the user here.
                })
            }, (err) => next(err));
        }
        else if (dish == null){ // dish doesn't exist, cannot update comments
            err = new Error('Dish' + req.params.dishId + ' not found');
            err.status = 404;
            return next(err); // we're just going to return that error here from the get operation
        }
        else{ // commentID doesn't exist, cannot update comments
            err = new Error('Comment' + req.params.commentId + ' not found');
            err.status = 404;
            return next(err);
            }
    }, (err) => next(err))
    .catch((err) => next(err));
})
.delete(authenticate.verifyUser, (req, res, next) => {
    Dishes.findById(req.params.dishId)
    .then((dish) => { // resp, Server response
        if(dish != null && dish.comments.id(req.params.commentId) != null &&
                dish.comments.id(req.param.commentId).author.eqauls(req.user._id)){
            dish.comments.id(req.params.commentId).remove();           
            dish.save() // save the collection 
            .then((dish) => {
                Dishes.findById(dish._id)
                .populate('comments.author')
                .then((dish) => {
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.json(dish);  // returning the updated dish back to the user here.
                })
            }, (err) => next(err));
        }
        else if (dish == null){ // dish doesn't exist, cannot update comments
            err = new Error('Dish' + req.params.dishId + ' not found');
            err.status = 404;
            return next(err); // we're just going to return that error here from the get operation
         }
        else{ // commentID doesn't exist, cannot update comments
            err = new Error('Comment' + req.params.commentId + ' not found');
            err.status = 404;
            return next(err);
        }
    }, (err) => next(err))
    .catch((err) => next(err));
});

module.exports = dishRouter;