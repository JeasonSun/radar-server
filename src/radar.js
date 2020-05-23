import '@babel/polyfill';
import ace from '@adonisjs/ace';
//https://adonisjs.com/docs/4.1/ace

const registeredCommandList = [
    // 工具类命令
    './commands/utils/generate_sql', // 生成SQL;
    // './commands/utils/template_sql', // 生成模板数据
];

for (let command of registeredCommandList){
    ace.addCommand(require(command)['default']);
}


// Boot ace to execute commands;
ace.wireUpWithCommander();
ace.invoke();
