import User from '~/src/routes/api/user';
import Login from '~/src/routes/api/login';
import Project from '~/src/routes/api/project';



export default{
    ...User,
    ...Login,
    ...Project
}