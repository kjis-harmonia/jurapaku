# ジュラパク！

スマートフォン縦画面向けの、小さな恐竜保護区経営ゲームです。ReactがUI、Phaserがゲームシミュレーションを担当します。

## 現在の実装範囲

PHASE 0からPHASE 3に加え、PHASE 4「コンテスト・常連客・レア恐竜」を実装しています。

- モコ（ミニリーフ）の歩行、睡眠、happy演出
- 来園者3タイプの観察、満足度、施設利用、退場
- 木の餌場、モコの葉っぱクッキー屋、休憩トイレのグリッド配置
- 観察料と売店収益
- 高満足退場と売店購入による評判上昇
- 評判に応じた来園間隔の短縮（最大25%、同時6人まで）
- 園路に沿った売店・トイレへの移動と、満足度・評判の獲得演出
- 孵化施設、卵タイマー、2匹目以降のミニリーフ誕生
- 個体ごとの保護年数・世代・人気度と、祝福される卒業
- 卒業個体のレジェンド登録と世代継承
- 3日ごとのコンテストと順位に応じた資金・評判報酬
- 常連客5人、レア来園者3種の再来園・成長・固有イベント
- 初来園日と来園回数を記録する来園者図鑑
- コンテスト条件で解放されるホシツノ幼体とレア卵
- 昼夜、天候、効果音、ミュート、速度切替
- localStorageへの自動保存と復元

ティラノ、海エリア、サファリバス、ナイトサファリ、戦闘、課金は扱いません。

## 構成

```text
src/
  components/          React UI
    GameContainer.tsx  ReactとEventBusの接続、UI状態
    UIPanel.tsx         ステータス・操作パネル
    BuildMenu.tsx       施設選択
    PhaserGame.tsx      Phaserのマウントと破棄
  game/
    entities/
      Dinosaur.ts       モコの状態機械
      Visitor.ts        来園者の移動・満足度・施設利用
    scenes/
      MainScene.ts      シミュレーション、施設配置、経営状態
    constants.ts        バランス値と初期状態
    types.ts            共有データ型
    EventBus.ts         ReactとPhaser間のイベント
    SaveManager.ts      localStorage保存・旧データ補完
    SoundManager.ts     Web Audio API効果音
```

Reactはゲーム状態を直接変更せず、操作を`EventBus`へ送ります。資金、評判、施設、来園者の生成などの正本は`MainScene`が持ち、個体の行動は各entityが担当します。

## セーブ

キーは`jurapaku-save-v1`です。資金、評判、日数、昼夜、天候、施設座標、現役恐竜、卵、世代、保護年数、人気度、レジェンド、コンテスト、来園者図鑑、解放種、レア卵、音設定、ゲーム速度を保存します。旧形式のモコ1匹データは初代の`dinosaurs[]`へ自動移行します。

## 開発

```bash
npm install
npm run dev
npm run build
npm run lint
```
