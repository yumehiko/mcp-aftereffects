const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:8080';

/**
 * レイヤーのリストを取得します。
 * @returns {Promise<Layer[]>} レイヤーの配列
 */
async function getLayerList() {
  try {
    const response = await fetch(`${BASE_URL}/layers`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const result = await response.json();
    if (result.status === 'error') {
      throw new Error(result.message);
    }
    return result.data;
  } catch (error) {
    console.error('Error fetching layer list:', error);
    return { success: false, message: error.message };
  }
}

/**
 * 指定したレイヤーのプロパティツリーを取得します。
 * @param {number} layerId レイヤーID
 * @param {{ includeGroups?: string[], excludeGroups?: string[], maxDepth?: number }} [options] 取得オプション
 * @returns {Promise<Property[]>} プロパティの配列
 */
async function getPropertyTree(layerId, options = {}) {
  if (!layerId) {
    return { success: false, message: 'layerId is required' };
  }
  try {
    const params = new URLSearchParams({ layerId: String(layerId) });
    const { includeGroups, excludeGroups, maxDepth } = options;
    if (Array.isArray(includeGroups)) {
      includeGroups.filter(Boolean).forEach(group => params.append('includeGroup', group));
    }
    if (Array.isArray(excludeGroups)) {
      excludeGroups.filter(Boolean).forEach(group => params.append('excludeGroup', group));
    }
    if (typeof maxDepth === 'number' && maxDepth > 0) {
      params.set('maxDepth', String(Math.floor(maxDepth)));
    }

    const response = await fetch(`${BASE_URL}/properties?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const result = await response.json();
    if (result.status === 'error') {
      throw new Error(result.message);
    }
    return result.data;
  } catch (error) {
    console.error(`Error fetching property tree for layer ${layerId}:`, error);
    return { success: false, message: error.message };
  }
}

/**
 * 指定したレイヤーのプロパティにエクスプレッションを設定します。
 * @param {number} layerId レイヤーID
 * @param {string} propertyPath プロパティパス
 * @param {string} expression エクスプレッション
 * @returns {Promise<{success: boolean, message: string}>} 実行結果
 */
async function setExpression(layerId, propertyPath, expression) {
  if (!layerId || !propertyPath || expression === undefined) {
    return { success: false, message: 'layerId, propertyPath, and expression are required' };
  }
  try {
    const response = await fetch(`${BASE_URL}/expression`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ layerId, propertyPath, expression }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const result = await response.json();
    if (result.status === 'error') {
      throw new Error(result.message);
    }
    return { success: true, message: result.message };
  } catch (error) {
    console.error('Error setting expression:', error);
    return { success: false, message: error.message };
  }
}

module.exports = {
  getLayerList,
  getPropertyTree,
  setExpression,
};
