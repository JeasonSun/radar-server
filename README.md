

### 搭建项目
```
// watch src文件并且babel输出至dist
"watch": "babel src --copy-files --watch --out-dir dist  --ignore src/public --verbose --source-maps"

// 启动dist/app.js
 "dev": "NODE_ENV=development nodemon dist/app.js"
```

### 路由列表
#### User路由
- [POST]/api/user/register  注册用户
- [GET]/api/user/detail 获取用户信息

#### Login路由
- [POST]/api/login 用户登录(暂时无使用场景，通过LOGIN_TYPE调用特定登录方式)
- [POST]/api/login/normal 常规登录方式，网页Site登录
- [POST]/api/login/uc  内部登录方式，暂时没有写具体内容
- [GET]/api/logout  用户退出
- [GET]/api/login/type 获取默认的用户登录方式

#### Project路由
##### Project.item
- 


### Commander
> 在radar.js中通过`@adonisjs/ace`注册了各种命令，主要命令如下：
#### 工具类命令
- Utils:GenerateSQL 数据库建表
