const router = require('koa-router')()
const util = require('../utils/util')
const Menu = require('../models/menuSchema')


// 路由前缀
router.prefix('/menu')

// 菜单列表查询
router.get('/list', async (ctx) => {
    const { menuName, menuState } = ctx.request.query;
    const params = {};
    if (menuName) params.menuName = menuName;
    if (menuState) params.menuState = menuState;
    let rootList = await Menu.find(params) || [];
    const permissionList = util.getTreeMenu(rootList, null, [])
    ctx.body = util.success(permissionList);
});



// 菜单编辑 删除 新增功能
router.post('/operate', async (ctx) => {
    const { _id, action, ...params } = ctx.request.body;
    let res, info;
    try {
        if (action == 'add') {
            // 因为params无需更多处理
            // 新建用户时是需要对数据进行处理的
            // 这里可以直接用create创建
            res = await Menu.create(params);
            console.log(res)
            info = '创建成功';
        } else if (action == 'edit') {
            // 更新-修改时间
            params.updateTime = new Date();
            res = await Menu.findByIdAndUpdate(_id, params);
            info = '编辑成功';
        } else {
            // 通过ID找到这条并且删除
            res = await Menu.findByIdAndRemove(_id);
            // 删除其子菜单数据
            await Menu.deleteMany({ parentId: { $all: [_id] } });
            info = '删除成功';
        }
        ctx.body = util.success('', info);
    } catch (error) {
        console.log(error)
        ctx.body = util.fail(error.stack);
    }
});


module.exports = router