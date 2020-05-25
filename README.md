

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
- [TODO]search
- [TODO]update
- [TODO]deleteRecord
- [TODO]searchUC
- [TODO]modifyPassword
- [TODO]modifyMsg
- [TODO]destroyAccount

#### Login路由
- [POST]/api/login 用户登录(暂时无使用场景，通过LOGIN_TYPE调用特定登录方式)
- [POST]/api/login/normal 常规登录方式，网页Site登录
- [GET]/api/logout  用户退出
- [GET]/api/login/type 获取默认的用户登录方式
- [TODO][POST]/api/login/uc  内部登录方式，暂时没有写具体内容
- [TODO][POST]/api/login/site  测试用，生成一个最小权限的空User登录。

#### Project路由
##### Project.item 管理员权限
- [POST]/api/project/item/add 添加项目
- [POST]/api/project/item/update 更新项目信息
- [POST]/api/project/item/delete 根据ID删除项目（逻辑删除，update is_delete:1）
- [GET]/api/project/item/detail 查看项目详情
- [GET]/api/project/item/list 获取项目列表

##### Project.member 
- [POST]/project/:id/api/project/member/add 给项目中添加成员
- [POST]/project/:id/api/project/member/update (role,alarm）
- [TODO][GET]/project/:id/api/project/member/list 获取当前项目的所有成员 project_id(在路由里)
- [TODO][GET]/project/:id/api/project/member/delete 删除项目中成员







### Commander
> 在radar.js中通过`@adonisjs/ace`注册了各种命令，主要命令如下：
#### 工具类命令
- Utils:GenerateSQL 数据库建表
