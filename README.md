

### 搭建项目
```
// watch src文件并且babel输出至dist
"watch": "babel src --copy-files --watch --out-dir dist  --ignore src/public --verbose --source-maps"

// 启动dist/app.js
 "dev": "NODE_ENV=development nodemon dist/app.js"
```