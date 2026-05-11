const { demoMembers, getLevel, getMemberOrderStats } = require('../../utils/menu');
const { getMyMemberProfile } = require('../../utils/cloudApi');

function fallbackState() {
  const member = demoMembers[0];
  return {
    member,
    level: getLevel(member.levelId),
    stats: getMemberOrderStats(member.levelId),
  };
}

Page({
  data: {
    ...fallbackState(),
    loading: false,
    feedback: '',
  },

  onShow() {
    this.loadMemberProfile();
  },

  loadMemberProfile() {
    const app = getApp();
    if (!app.globalData.cloudReady) {
      return;
    }
    this.setData({ loading: true, feedback: '' });
    getMyMemberProfile()
      .then((result) => {
        const member = {
          id: result.member.id,
          nickname: result.member.nickname,
          phone: result.member.phone,
          levelId: result.member.levelId,
        };
        if (app.globalData) {
          app.globalData.currentMember = member;
        }
        this.setData({
          member,
          level: result.level || getLevel(member.levelId),
          stats: getMemberOrderStats(member.levelId),
          loading: false,
        });
      })
      .catch((error) => {
        console.error('cloud member profile failed', error);
        this.setData({
          ...fallbackState(),
          loading: false,
          feedback: error.message || '会员资料加载失败',
        });
      });
  },
});
