import express from 'express';
import Api from '~/src/routes/api';
import RouterConfigBuilder from '~/src/lib/utils/modules/router_config_builder';
import Logger from '~/src/lib/logger';
import PrivilegeChecker from '~/src/middlewares/privilege';

const baseRouter = express.Router();

// 路由分类：
// 不需要登录
const withoutLoginRouter = express.Router();
// 需要登录
const loginRouter = express.Router();
// 需要登录 -- 需要项目id
const loginProjectRouter = express.Router();
// 需要登录 -- 不需要项目id
const loginCommonRouter = express.Router();

let routerConfigMap = {
    ...Api
}

/**
 * 根据请求方法注册路由
 * @param {*} customerRouter
 * @param {*} routerConfig
 * @param {*} url
 */
function registerRouterByMethod(customerRouter, routerConfig, url) {
    switch (routerConfig.methodType) {
        case RouterConfigBuilder.METHOD_TYPE_GET:
            customerRouter.get(url, (req, res) => {
                return routerConfig.func(req, res)
            })
            break
        case RouterConfigBuilder.METHOD_TYPE_POST:
            customerRouter.post(url, (req, res) => {
                return routerConfig.func(req, res)
            })
            break
        default:
    }
}

// 中间件
// 注册路由中间件, 需要在注册路由地址之前使用
// FIX: fee中之间全局注册中间件，会导致404无法触发。在遍历routerConfigMap时候再注册中间件，加上url，这样就能有效过滤。
// loginRouter.use(PrivilegeChecker.checkLogin);

// loginProjectRouter.use(PrivilegeChecker.checkPrivilege)

// 自动注册
for (let url of Object.keys(routerConfigMap)) {
    let routerConfig = routerConfigMap[url];
    if (routerConfig.needLogin) {
        // 需要登录
        loginRouter.use(url, PrivilegeChecker.checkLogin);
        if (routerConfig.needProjectId) {
            // 需要校验项目权限
            loginProjectRouter.use(url, PrivilegeChecker.checkPrivilege)
            Logger.log(`需要登录,也需要检验项目权限(Method: ${routerConfig.methodType}) =>`, url);
            registerRouterByMethod(loginProjectRouter, routerConfig, url)
        } else {
            // 不需要校验项目权限
            Logger.log(`需要登录,但不需要检验项目权限(Method: ${routerConfig.methodType}) =>`, url)
            registerRouterByMethod(loginCommonRouter, routerConfig, url)
        }
    } else {
        Logger.log(`不需要登录(Method: ${routerConfig.methodType}) =>`, url)
        // 不需要登录
        registerRouterByMethod(withoutLoginRouter, routerConfig, url)
    }
}

// 额外注册首页
withoutLoginRouter.get('/', (req, res) => {
    res.render('index', {
        title: '额外注册首页'
    });
})

// 处理逻辑为: 从上到下, 依次处理
loginRouter.use('/', loginCommonRouter);
loginRouter.use('/project/:id', loginProjectRouter);

baseRouter.use('/', withoutLoginRouter);
baseRouter.use('/', loginRouter);



export default baseRouter;