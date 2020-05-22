import '@babel/polyfill';

import express, { Router } from 'express';
import path from 'path';
import ejs from 'ejs';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import _ from 'lodash';

import appConfig from '~/src/configs/app';
import Logger from '~/src/lib/logger';
import PrivilegeChecker from '~/src/middlewares/privilege';
import router from '~/src/routes/index';


const startup = () => {
    const app = express();
    // 设置存放模板引擎目录
    app.set('views', path.join(__dirname, '../public'));

    // 设置模板引擎为ejs
    app.engine('html', ejs.renderFile);
    app.set('view engine', 'html');

    // 设置body-parser
    app.use(bodyParser.urlencoded({ extended: false }));
    // 解析json请求
    app.use(bodyParser.json({ extended: false }));

    // 设置cookie-parse
    app.use(cookieParser());

    // 支持跨域
    app.use(cors({
        origin: true,
        methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
        credentials: true
    }));

    // 将用户信息&项目信息补充到req中(在router内进行权限检测)
    app.use(PrivilegeChecker.appendUserInfo);
    app.use(PrivilegeChecker.appendProjectInfo);

    // 添加接口路径
    app.use('/', async (req, res, next) => {
        let path = req.path;
        // 只对以 /api & /project/${projectId}/api 路径开头的接口进行响应
        let projectApiReg = /^\/project\/\d+\/api/i;
        if (_.startsWith(path, '/api') || path.search(projectApiReg) === 0) {
            return router(req, res, next);
        } else {
            next();
        }
    });


    app.use('*', (req, res) => {
        res.render('index');
    });

    app.listen(appConfig.port, function () {
        Logger.log(`${appConfig.name} listening on port ${appConfig.port}`)
    });

}

startup();


process.on('uncaughtException', function (err) {
    // TODO: 服务器发送错误时报警并重启
    Logger.error(err + ':服务器重新启动，启动时间：' + (new Date()).toString())
    // Alert.sendMessage(WatchIdList.WATCH_UCID_LIST_DEFAULT, `[fee-rd]服务器重新启动, 原因: ${err}, 启动时间：${(new Date()).toString()}`)
    startup(); 
})
