import express from 'express';


const baseRouter = express.Router();

baseRouter.get('/api/test', function(req, res){
    res.end('test');
})


export default baseRouter;