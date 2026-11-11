import { showConfirmDialog } from 'vant'

/** 两端都有不同进度时询问；确认=推荐侧，取消=另一侧 */
export async function promptProgressConflict({ preferCloud }) {
  try {
    await showConfirmDialog({
      title: '进度不一致',
      message: preferCloud
        ? '云端与本机都有学习记录且内容不同。推荐使用较新的云端进度。'
        : '云端与本机都有学习记录且内容不同。推荐使用较新的本机进度并上传。',
      confirmButtonText: preferCloud ? '使用云端' : '使用本机',
      confirmButtonColor: '#b03a2e',
      cancelButtonText: preferCloud ? '使用本机' : '使用云端'
    })
    return preferCloud ? 'cloud' : 'local'
  } catch {
    return preferCloud ? 'local' : 'cloud'
  }
}
