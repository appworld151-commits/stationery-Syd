import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Lang = 'ckb' | 'en' | 'ar' | 'ja'
export const LANGS: Record<Lang, { label: string; dir: 'rtl' | 'ltr' }> = {
  ckb: { label: 'کوردی سۆرانی', dir: 'rtl' },
  en: { label: 'English', dir: 'ltr' },
  ar: { label: 'العربية', dir: 'rtl' },
  ja: { label: '日本語', dir: 'ltr' }
}

const dict: Record<Lang, Record<string, string>> = {
  en: { home: 'Home', store: 'Bookstore', library: 'My Library', settings: 'Settings', search: 'Search books or authors', theme: 'Theme', language: 'Language', noBooks: 'No books yet', supabaseMissing: 'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see README) and rebuild.', login: 'Sign in', signup: 'Create account', logout: 'Sign out', email: 'Email', password: 'Password', name: 'Display name', noAccount: 'No account? Create one', haveAccount: 'Have an account? Sign in', checkEmail: 'Check your email to confirm your account, then sign in.', loading: 'Loading…', loadError: 'Something went wrong. Please try again.', owned: 'Owned', pending: 'Pending approval', getFree: 'Get free', request: 'Request', open: 'Open', admin: 'Admin', pendingPayments: 'Pending purchases', approve: 'Approve', reject: 'Reject', allCategories: 'All categories', noResults: 'No matching books', signInToGet: 'Sign in to get this book', emptyLibrary: 'Your library is empty', notFound: 'Page not found', backHome: 'Back to home', requested: 'Request sent. It will appear in your library once approved.', added: 'Added to your library', nothingPending: 'No pending purchases', free: 'Free', welcome: 'Latest books', supabaseInvalid: "Supabase configuration is invalid. VITE_SUPABASE_URL must be the full https URL and VITE_SUPABASE_ANON_KEY the publishable (anon) key - never a secret or service_role key." },
  ckb: { home: 'سەرەکی', store: 'کتێبخانە', library: 'کتێبخانەکەم', settings: 'ڕێکخستنەکان', search: 'گەڕان بە ناوی کتێب یان نووسەر', theme: 'ڕووکار', language: 'زمان', noBooks: 'هێشتا کتێب نییە', supabaseMissing: 'Supabase ڕێکنەخراوە. VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY دابنێ (README ببینە) و دووبارە بیکە بیلد.', login: 'چوونەژوورەوە', signup: 'دروستکردنی هەژمار', logout: 'چوونەدەرەوە', email: 'ئیمەیڵ', password: 'وشەی نهێنی', name: 'ناو', noAccount: 'هەژمارت نییە؟ دروستی بکە', haveAccount: 'هەژمارت هەیە؟ بچۆ ژوورەوە', checkEmail: 'ئیمەیڵەکەت بپشکنە بۆ پشتڕاستکردنەوەی هەژمارەکەت، پاشان بچۆ ژوورەوە.', loading: 'بارکردن…', loadError: 'هەڵەیەک ڕوویدا. تکایە دووبارە هەوڵ بدەوە.', owned: 'هی تۆیە', pending: 'چاوەڕێی پەسەندکردنە', getFree: 'بەخۆڕایی وەریبگرە', request: 'داواکاری', open: 'کردنەوە', admin: 'بەڕێوەبەر', pendingPayments: 'کڕینە چاوەڕوانکراوەکان', approve: 'پەسەندکردن', reject: 'ڕەتکردنەوە', allCategories: 'هەموو پۆلەکان', noResults: 'هیچ کتێبێکی گونجاو نییە', signInToGet: 'بچۆ ژوورەوە بۆ وەرگرتنی ئەم کتێبە', emptyLibrary: 'کتێبخانەکەت بەتاڵە', notFound: 'پەڕەکە نەدۆزرایەوە', backHome: 'گەڕانەوە بۆ سەرەکی', requested: 'داواکاری نێردرا. دوای پەسەندکردن لە کتێبخانەکەتدا دەردەکەوێت.', added: 'زیادکرا بۆ کتێبخانەکەت', nothingPending: 'هیچ کڕینێکی چاوەڕوانکراو نییە', free: 'بەخۆڕایی', welcome: 'نوێترین کتێبەکان', supabaseInvalid: "ڕێکخستنی Supabase هەڵەیە. VITE_SUPABASE_URL دەبێت URLی تەواوی https بێت و VITE_SUPABASE_ANON_KEY کلیلی publishable (anon) بێت، هەرگیز کلیلی secret یان service_role." },
  ar: { home: 'الرئيسية', store: 'المتجر', library: 'مكتبتي', settings: 'الإعدادات', search: 'ابحث عن كتاب أو مؤلف', theme: 'المظهر', language: 'اللغة', noBooks: 'لا توجد كتب بعد', supabaseMissing: 'Supabase غير مُعدّ. عيّن VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY (راجع README) ثم أعد البناء.', login: 'تسجيل الدخول', signup: 'إنشاء حساب', logout: 'تسجيل الخروج', email: 'البريد الإلكتروني', password: 'كلمة المرور', name: 'الاسم', noAccount: 'ليس لديك حساب؟ أنشئ حسابًا', haveAccount: 'لديك حساب؟ سجّل الدخول', checkEmail: 'تحقق من بريدك الإلكتروني لتأكيد الحساب ثم سجّل الدخول.', loading: 'جارٍ التحميل…', loadError: 'حدث خطأ. حاول مرة أخرى.', owned: 'مملوك', pending: 'بانتظار الموافقة', getFree: 'احصل عليه مجانًا', request: 'طلب', open: 'فتح', admin: 'الإدارة', pendingPayments: 'المشتريات المعلّقة', approve: 'موافقة', reject: 'رفض', allCategories: 'كل التصنيفات', noResults: 'لا توجد كتب مطابقة', signInToGet: 'سجّل الدخول للحصول على هذا الكتاب', emptyLibrary: 'مكتبتك فارغة', notFound: 'الصفحة غير موجودة', backHome: 'العودة للرئيسية', requested: 'تم إرسال الطلب. سيظهر في مكتبتك بعد الموافقة.', added: 'تمت الإضافة إلى مكتبتك', nothingPending: 'لا توجد مشتريات معلّقة', free: 'مجاني', welcome: 'أحدث الكتب', supabaseInvalid: "إعداد Supabase غير صالح. يجب أن يكون VITE_SUPABASE_URL عنوان https كاملًا وVITE_SUPABASE_ANON_KEY المفتاح العام (publishable/anon)، وليس مفتاحًا سريًا أو service_role." },
  ja: { home: 'ホーム', store: 'ブックストア', library: 'マイライブラリ', settings: '設定', search: '書名または著者で検索', theme: 'テーマ', language: '言語', noBooks: 'まだ本がありません', supabaseMissing: 'Supabase が未設定です。VITE_SUPABASE_URL と VITE_SUPABASE_ANON_KEY を設定して再ビルドしてください（README 参照）。', login: 'ログイン', signup: 'アカウント作成', logout: 'ログアウト', email: 'メールアドレス', password: 'パスワード', name: '表示名', noAccount: 'アカウントをお持ちでない方はこちら', haveAccount: 'アカウントをお持ちの方はログイン', checkEmail: 'メールを確認してアカウントを認証し、ログインしてください。', loading: '読み込み中…', loadError: '問題が発生しました。もう一度お試しください。', owned: '所有済み', pending: '承認待ち', getFree: '無料で入手', request: 'リクエスト', open: '開く', admin: '管理', pendingPayments: '保留中の購入', approve: '承認', reject: '却下', allCategories: 'すべてのカテゴリ', noResults: '該当する本がありません', signInToGet: 'この本を入手するにはログインしてください', emptyLibrary: 'ライブラリは空です', notFound: 'ページが見つかりません', backHome: 'ホームへ戻る', requested: 'リクエストを送信しました。承認後にライブラリに追加されます。', added: 'ライブラリに追加しました', nothingPending: '保留中の購入はありません', free: '無料', welcome: '新着の本', supabaseInvalid: "Supabase の設定が無効です。VITE_SUPABASE_URL は完全な https URL、VITE_SUPABASE_ANON_KEY は公開 (publishable / anon) キーにしてください。secret や service_role キーは使用しないでください。" }
}

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: string) => string }
const I18n = createContext<Ctx>(null!)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    try {
      const saved = localStorage.getItem('lang')
      return saved && saved in LANGS ? (saved as Lang) : 'en'
    } catch { return 'en' }
  })
  useEffect(() => {
    try { localStorage.setItem('lang', lang) } catch { /* storage unavailable */ }
    document.documentElement.lang = lang
    document.documentElement.dir = LANGS[lang].dir
  }, [lang])
  const t = (k: string) => dict[lang][k] ?? dict.en[k] ?? k
  return <I18n.Provider value={{ lang, setLang, t }}>{children}</I18n.Provider>
}
export const useI18n = () => useContext(I18n)
