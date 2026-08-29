import LegalPageLayout from "./component/LegalPageLayout";
import Alert from "@mui/material/Alert";

// 特定商取引法に基づく表記。
// 住所・電話番号は消費者庁ガイドラインに沿い「請求があれば遅滞なく開示する」方式にしている。
// メールアドレスはサービス専用のものを別途作成予定のため、それまでは目立つ形でTODOを残す
export default function TokushohoPage() {
  return (
    <LegalPageLayout title="特定商取引法に基づく表記" updatedAt="2026年8月29日">
      <Alert severity="warning" sx={{ mb: 3 }}>
        現在、有料プラン（Proプラン）はまだ提供を開始していません。この表記は、提供開始に先立ちご案内するものです。
      </Alert>
      <table>
        <tbody>
          <tr>
            <th>販売業者</th>
            <td>戸田啓太</td>
          </tr>
          <tr>
            <th>運営統括責任者</th>
            <td>戸田啓太</td>
          </tr>
          <tr>
            <th>所在地</th>
            <td>ご請求をいただいた場合、遅滞なく開示いたします。</td>
          </tr>
          <tr>
            <th>電話番号</th>
            <td>ご請求をいただいた場合、遅滞なく開示いたします。</td>
          </tr>
          <tr>
            <th>メールアドレス</th>
            {/* TODO: サービス専用のメールアドレスを作成し次第、ここを差し替える */}
            <td>準備中です。サービス開始までにご案内します。当面は本サービス内のお問い合わせフォームをご利用ください。</td>
          </tr>
          <tr>
            <th>販売価格</th>
            <td>
              Proプラン：月額480円（税込）／ 年額4,800円（税込）
              <br />
              上記以外に、商品の販売に関して発生する費用はありません。
            </td>
          </tr>
          <tr>
            <th>お支払い方法</th>
            <td>クレジットカード決済を予定しています（提供開始時に別途ご案内します）。</td>
          </tr>
          <tr>
            <th>お支払い時期</th>
            <td>お申し込み時に初回のお支払いが発生し、以降は各更新日（月額は毎月、年額は毎年）に自動的に課金されます。</td>
          </tr>
          <tr>
            <th>サービス提供時期</th>
            <td>決済完了後、直ちにProプランの機能をご利用いただけます。</td>
          </tr>
          <tr>
            <th>返品・返金について</th>
            <td>初回登録日から7日以内であれば、お問い合わせフォームよりご連絡いただくことで全額返金いたします。それ以降の返金は、法令に定めがある場合を除き対応いたしかねます。</td>
          </tr>
          <tr>
            <th>解約について</th>
            <td>本サービス内、またはお問い合わせフォームよりいつでも解約（自動更新の停止）を申請できます。</td>
          </tr>
          <tr>
            <th>動作環境</th>
            <td>最新版のGoogle Chrome、Safari、Microsoft Edge等のモダンブラウザでのご利用を推奨します。</td>
          </tr>
        </tbody>
      </table>
    </LegalPageLayout>
  );
}
