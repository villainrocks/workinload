/* This code fixed By Tg:@ImxCodex */
const normalizeText = (value) => String(value || '').trim().toLowerCase();

const normalizeUsername = (value) => String(value || '').trim().replace(/^@/, '').toLowerCase();

export const findEquivalentGroupId = (groups, sourceTargetId, targetAccountId) => {
  const sourceId = String(sourceTargetId || '').trim();
  const sourceGroup = groups.find(group => String(group.id) === sourceId);

  if (!sourceGroup) {
    return sourceId;
  }

  if (String(sourceGroup.account_id) === String(targetAccountId)) {
    return sourceGroup.id;
  }

  const accountGroups = groups.filter(group => String(group.account_id) === String(targetAccountId));
  const sourceTelegramId = String(sourceGroup.telegram_id || '');
  const sourceUsername = normalizeUsername(sourceGroup.username);
  const sourceTitle = normalizeText(sourceGroup.title);

  const equivalent = accountGroups.find(group => (
    (sourceTelegramId && String(group.telegram_id || '') === sourceTelegramId) ||
    (sourceUsername && normalizeUsername(group.username) === sourceUsername) ||
    (sourceTitle && normalizeText(group.title) === sourceTitle)
  ));

  return equivalent?.id || null;
};

export const remapTargetIdsForAccount = (groups, sourceTargetIds, targetAccountId) => {
  const mapped = [];
  let missing = 0;

  for (const targetId of sourceTargetIds) {
    const equivalentId = findEquivalentGroupId(groups, targetId, targetAccountId);
    if (equivalentId) {
      mapped.push(equivalentId);
    } else {
      missing += 1;
    }
  }

  return {
    targetIds: Array.from(new Set(mapped)),
    missing,
  };
};
