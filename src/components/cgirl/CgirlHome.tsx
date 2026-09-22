import Link from 'next/link';
import { ArrowDown, ArrowUpRight, Crown, Gamepad2, Heart, Martini, Music2, Sparkles, Star, Ticket, Users, Zap } from 'lucide-react';
import styles from './CgirlHome.module.css';

export default function CgirlHome() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" aria-label="C-GIRL ホーム" className={styles.logo}>C-GIRL<span>PARTY GAMES</span></Link>
        <nav aria-label="メインナビゲーション">
          <Link href="/guide" className={styles.guideLink}>あそび方 <ArrowUpRight size={14} /></Link>
          <Link href="/join" className={styles.headerJoin}><Ticket size={16} /> ゲームに参加</Link>
        </nav>
      </header>

      <div className={styles.mainGrid}>
        <section className={styles.poster} aria-labelledby="cgirl-title">
          <div className={styles.disco} aria-hidden="true"><div className={styles.discoBall} /><Sparkles className={styles.discoSpark} /></div>
          <div className={styles.doodles} aria-hidden="true"><Crown className={styles.crown} /><Heart className={styles.heart} /><Martini className={styles.martini} /><Star className={styles.star} /><Music2 className={styles.music} /></div>
          <div className={styles.posterCopy}>
            <span className={styles.location}>SENDAI・KOKUBUNCHO</span>
            <h1 id="cgirl-title" className={styles.neonLogo}>C-girl</h1>
            <span className={styles.partySign}>PARTY PLAYROOM</span>
            <p className={styles.partyCopy}>今夜は、遊んだもん勝ち。</p>
            <span className={styles.scribble}>Good people. Great nights!</span>
          </div>
        </section>

        <section className={styles.playPanel} aria-labelledby="play-title">
          <div className={styles.eyebrow}><span /> LET’S PLAY TOGETHER</div>
          <h2 id="play-title">さあ、なにして<span>盛り上がる？<Sparkles aria-hidden size={27} /></span></h2>
          <p className={styles.intro}>スマホ片手に、みんなでワイワイ。<br />次の「えーっ！」は、あなたの答えかも。</p>
          <Link href="/presets" className={styles.playButton}>
            <Gamepad2 size={25} /><span>ゲームを選んで遊ぶ<small>クイズ・多数派ゲーム・みんなで投票</small></span><ArrowUpRight size={23} />
          </Link>
          <Link href="/join" className={styles.joinButton}>
            <Ticket size={24} /><span>参加コードで合流<small>開催中のゲームに参加する</small></span><ArrowUpRight size={22} />
          </Link>
          <div className={styles.quickGuide}>
            <span className={styles.miniLabel}>HOW TO PARTY</span>
            <ol><li><b>01</b>ゲームを選ぶ</li><li><b>02</b>みんなで参加</li><li><b>03</b>答えて笑おう！</li></ol>
            <Link href="/guide">はじめての方へ・あそび方 <ArrowUpRight size={14} /></Link>
          </div>
          <Link href="#games" className={styles.explore}>今夜の遊びをチェック <ArrowDown size={14} /></Link>
        </section>
      </div>

      <div className={styles.ticker} aria-hidden="true"><span>GOOD GIRLS</span><Sparkles /><span>GOOD GAMES</span><Heart /><span>GOOD TIMES</span><Music2 /><span>C-GIRL</span><Sparkles /><span>GOOD GIRLS</span><Heart /><span>GOOD GAMES</span></div>

      <section id="games" className={styles.games} aria-labelledby="games-title">
        <div className={styles.sectionHeading}><div><span className={styles.miniLabel}>TONIGHT’S PLAYLIST</span><h2 id="games-title">盛り上がり方は、いろいろ。</h2></div><Link href="/presets">ゲーム一覧 <ArrowUpRight size={16} /></Link></div>
        <div className={styles.gameGrid}>
          <Link href="/presets" className={styles.gameCard} data-tone="pink"><div className={styles.cardTop}><Users size={29} /><span>01 / VOTE</span><ArrowUpRight size={19} /></div><h3>みんなの本音、どっち？</h3><p>多数派？ 少数派？<br />意外な答えで、会話がはずむ。</p><span className={styles.tag}>多数派・少数派ゲーム</span></Link>
          <Link href="/presets" className={styles.gameCard} data-tone="blue"><div className={styles.cardTop}><Zap size={29} /><span>02 / QUIZ</span><ArrowUpRight size={19} /></div><h3>その自信、ホンモノ？</h3><p>知ってるつもりが、まさかの展開。<br />みんなで挑戦、クイズタイム。</p><span className={styles.tag}>みんなでクイズ</span></Link>
          <Link href="/presets" className={styles.gameCard} data-tone="lime"><div className={styles.cardTop}><Sparkles size={29} /><span>03 / ORIGINAL</span><ArrowUpRight size={19} /></div><h3>今夜だけのお題を。</h3><p>好きなテーマでAIがお題づくり。<br />このメンバーならではの楽しみ方。</p><span className={styles.tag}>AIでオリジナルゲーム</span></Link>
        </div>
      </section>
      <footer className={styles.footer}><Link href="/" className={styles.footerLogo}>C-GIRL <Heart size={17} /></Link><span>GOOD MUSIC. GOOD GIRLS. GOOD TIME.</span><Link href="/auth/login">ホストログイン <ArrowUpRight size={14} /></Link></footer>
    </main>
  );
}
