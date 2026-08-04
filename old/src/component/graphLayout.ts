// 学習記録同士のつながりを、シンプルな力学モデル（Fruchterman-Reingold風）で
// 2次元に配置する。外部のグラフ描画ライブラリは使わず、軽量な自前実装にとどめる。
import { findRelatedItems } from "./relatedNotes";

export interface GraphRelatable {
  id: number;
  title: string;
  category_name: string;
  tags: string[];
}

export interface GraphNode<T extends GraphRelatable> {
  item: T;
  x: number;
  y: number;
  degree: number;
}

export interface GraphEdge {
  sourceId: number;
  targetId: number;
}

export interface GraphLayout<T extends GraphRelatable> {
  nodes: GraphNode<T>[];
  edges: GraphEdge[];
}

// 各ノードごとに上位3件の関連メモへエッジを張り、重複（無向）は除去する
export const buildGraphEdges = <T extends GraphRelatable>(items: T[]): GraphEdge[] => {
  const edgeKeys = new Set<string>();
  const edges: GraphEdge[] = [];
  items.forEach((item) => {
    const related = findRelatedItems(item, items, 3);
    related.forEach((r) => {
      const key = item.id < r.id ? `${item.id}:${r.id}` : `${r.id}:${item.id}`;
      if (edgeKeys.has(key)) return;
      edgeKeys.add(key);
      edges.push({ sourceId: item.id, targetId: r.id });
    });
  });
  return edges;
};

// 反発力（全ペア）＋バネの引力（エッジ）＋中心へのゆるい引力で位置を収束させる
export const layoutGraph = <T extends GraphRelatable>(
  items: T[],
  width: number,
  height: number,
  iterations = 150
): GraphLayout<T> => {
  const edges = buildGraphEdges(items);
  const degreeMap = new Map<number, number>();
  edges.forEach((e) => {
    degreeMap.set(e.sourceId, (degreeMap.get(e.sourceId) ?? 0) + 1);
    degreeMap.set(e.targetId, (degreeMap.get(e.targetId) ?? 0) + 1);
  });

  const n = items.length;
  const nodes: (GraphNode<T> & { fx: number; fy: number })[] = items.map((item, i) => {
    const angle = (i / Math.max(1, n)) * Math.PI * 2;
    const r = Math.min(width, height) * 0.3;
    return {
      item,
      x: width / 2 + r * Math.cos(angle),
      y: height / 2 + r * Math.sin(angle),
      degree: degreeMap.get(item.id) ?? 0,
      fx: 0,
      fy: 0,
    };
  });

  if (n === 0) return { nodes: [], edges: [] };

  const idIndex = new Map(nodes.map((node, i) => [node.item.id, i]));
  // 理想距離。nが少ないと反発だけで端に張り付いてしまうため、面積基準の値を控えめに縮める
  const k = Math.sqrt((width * height) / n) * 0.55;

  for (let iter = 0; iter < iterations; iter++) {
    nodes.forEach((node) => {
      node.fx = 0;
      node.fy = 0;
    });

    // 反発力：全ノード間
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = nodes[i];
        const b = nodes[j];
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 0.01) {
          dx = Math.random() - 0.5;
          dy = Math.random() - 0.5;
          dist = 0.01;
        }
        const force = (k * k) / dist;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.fx += fx;
        a.fy += fy;
        b.fx -= fx;
        b.fy -= fy;
      }
    }

    // 引力：エッジで結ばれたノード間（バネモデル）
    edges.forEach((e) => {
      const a = nodes[idIndex.get(e.sourceId)!];
      const b = nodes[idIndex.get(e.targetId)!];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const force = (dist * dist) / k;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      a.fx -= fx;
      a.fy -= fy;
      b.fx += fx;
      b.fy += fy;
    });

    // 反発・引力を適用しつつ、中心への引力とキャンバス内へのクランプを行う。
    // 中心への引力を強めにすることで、ノード数が少ない時に端へ張り付くのを防ぐ
    nodes.forEach((node) => {
      const moveX = Math.max(-15, Math.min(15, node.fx * 0.02));
      const moveY = Math.max(-15, Math.min(15, node.fy * 0.02));
      node.x += moveX + (width / 2 - node.x) * 0.03;
      node.y += moveY + (height / 2 - node.y) * 0.03;
      node.x = Math.max(30, Math.min(width - 30, node.x));
      node.y = Math.max(30, Math.min(height - 30, node.y));
    });
  }

  return { nodes: nodes.map(({ item, x, y, degree }) => ({ item, x, y, degree })), edges };
};
