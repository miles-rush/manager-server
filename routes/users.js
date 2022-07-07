/**
 * 用户管理模块
 */
const router = require('koa-router')()
const User = require('./../models/userSchema')
const Counter = require('./../models/counterSchema')
const util = require('./../utils/util')
const jwt = require('jsonwebtoken')
const md5 = require('md5')

router.prefix('/users')

// 用户登录
router.post('/login', async (ctx) => {
  try {
    const { userName, userPwd } = ctx.request.body;
    /**
     * 返回数据库指定字段 有三种方式
     * 1.userId userName userEmail state role deptId roleList
     * 2.{userName:1-返回 0-不返回}
     * 3.select('userId')
     */
    const res = await User.findOne({
      userName,
      userPwd
    }, 'userId userName userEmail state role deptId roleList')

    if (res) {
      const data = res._doc;
      const token = jwt.sign({
        data: data,
      }, 'miles-rush', { expiresIn: '1h' })
      data.token = token;
      ctx.body = util.success(data);
    } else {
      ctx.body = util.fail("账号或密码不正确")
    }
  } catch (err) {
    ctx.body = util.fail(err.msg);
  }
});

// 用户的列表
router.get('/list', async (ctx) => {
  const { userId, userName, state } = ctx.request.query;
  const { page, skipIndex } = util.pager(ctx.request.query);
  let params = {};
  if (userId) params.userId = userId;
  if (userName) params.userName = userName;
  if (state && state != '0') params.state = state;
  try {
    const query = User.find(params, { _id: 0, userPwd: 0 });
    const list = await query.skip(skipIndex).limit(page.pageSize);
    const total = await User.countDocuments(params);

    ctx.body = util.success({
      page: {
        ...page,
        total
      },
      list
    })
  } catch (error) {
    ctx.body = util.fail(`查询异常:${error.stack}`)
  }
});

// 用户删除/批量删除
router.post('/delete', async (ctx) => {
  const { userIds } = ctx.request.body;
  const res = await User.updateMany({ userId: { $in: userIds } }, { state: 2 });
  // console.log(res)
  if (res.modifiedCount) {
    ctx.body = util.success(res, `共删除成功${res.modifiedCount}条`);
    return;
  }
  ctx.body = util.fail('删除失败')
});

// 用户新增/编辑
router.post('/operate', async (ctx) => {
  // 取出所有参数
  const { userId, userName, userEmail, mobile, job, state, roleList, deptId, action } = ctx.request.body;
  if (action == 'add') {
    // 参数验证
    if (!userName || !userEmail || !deptId) {
      ctx.body = util.fail('参数错误', util.CODE.PARAM_ERROR);
      return;
    }
    const res = await User.findOne({ $or: [{ userName }, { userEmail }] }, '_id userName userEmail');
    if (res) {
      ctx.body = util.fail(`系统检测到有重复的用户，信息如下:${res.userName} - ${res.userEmail}`);
    } else {
      const doc = await Counter.findOneAndUpdate({ _id: 'userId' }, { $inc: { sequence_value: 1 } }, { new: true })
      try {
        const user = new User({
          userId: doc.sequence_value,
          userName,
          userPwd: md5('123456'),
          userEmail,
          role: 1, // 默认普通用户
          roleList,
          job,
          state,
          deptId,
          mobile
        })
        user.save();
        ctx.body = util.success('', '用户创建成功');
      } catch (err) {
        ctx.body = util.fail(err.stack, '用户创建失败');
      }
    }

  } else {
    if (!deptId) {
      ctx.body = util.fail('部门不能为空', util.CODE.PARAM_ERROR);
      return;
    }
    try {
      const res = await Counter.findOneAndUpdate({ _id: 'userId' }, { $inc: { sequence_value: 1 } }, { new: true })
      ctx.body = util.success({}, '更新成功');
    } catch (error) {
      ctx.body = util.fail(err.stack, '更新失败');
    }
  }
});


module.exports = router
