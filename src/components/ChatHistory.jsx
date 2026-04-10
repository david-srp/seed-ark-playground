import MessageBubble from './MessageBubble'

const IMAGE_PROMPTS = [
  { label: '电影人像', text: 'A cinematic close-up portrait of a woman in golden hour light, shallow depth of field, 35mm film grain, award-winning photography, ultra-detailed skin texture' },
  { label: '赛博都市', text: 'Neon-drenched cyberpunk cityscape at night, rain-slicked streets reflecting holographic ads, dense fog, Blade Runner aesthetic, 8K hyperrealistic' },
  { label: '极简产品', text: 'Minimalist luxury perfume bottle on white marble, dramatic side lighting, studio photography, macro, perfect glass reflections' },
  { label: '日式禅意', text: 'Ancient Japanese torii gate in a misty bamboo forest at dawn, soft volumetric light, serene, Studio Ghibli color palette' },
  { label: '流体艺术', text: 'Abstract fluid art, swirling deep crimson and midnight black, high contrast, macro photography, glossy finish, award-winning' },
]

const VIDEO_PROMPTS = [
  { label: '星际漫步', text: 'A lone astronaut slowly walks across a glowing alien planet, epic slow dolly-in, ethereal bioluminescent fog, cinematic 35mm, orchestral atmosphere' },
  { label: '海浪慢动作', text: 'Extreme close-up of ocean waves crashing in slow motion, golden sunset backlight, aerial side pan, water droplets catching light, 4K nature documentary' },
  { label: '未来都市', text: 'Futuristic mega-city timelapse from dusk to midnight, flying vehicles weaving between holographic skyscrapers, neon intensifies, god-ray lighting' },
  { label: '丝绸舞者', text: 'A dancer in flowing crimson silk performs in an empty moonlit forest, ultra slow motion, natural diffused light, dreamy bokeh, ethereal mood' },
  { label: '咖啡拉花', text: 'Macro close-up of espresso being poured, swirling cream art forming in real-time, warm amber tones, smooth camera push-in, ASMR atmosphere' },
]

export default function ChatHistory({ messages, genType, onRegenerate, onEdit, onSuggestionSelect }) {
  return (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      padding: '28px 20px 180px',
      display: 'flex',
      flexDirection: 'column',
      gap: 24,
    }}>
      {messages.length === 0 ? (
        <EmptyState genType={genType} onSelect={onSuggestionSelect} />
      ) : (
        messages.map(msg => (
          <MessageBubble
            key={msg.id}
            message={msg}
            onRegenerate={() => onRegenerate(msg)}
            onEdit={() => onEdit(msg)}
          />
        ))
      )}
    </div>
  )
}

function EmptyState({ genType, onSelect }) {
  const prompts = genType === 'video' ? VIDEO_PROMPTS : IMAGE_PROMPTS

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 20,
      paddingBottom: 60,
      userSelect: 'none',
    }}>
      {/* Accent ornament */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 1, background: 'linear-gradient(to right, transparent, var(--accent))', opacity: 0.5 }} />
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', opacity: 0.8 }} />
        <div style={{ width: 40, height: 1, background: 'linear-gradient(to left, transparent, var(--accent))', opacity: 0.5 }} />
      </div>

      <div style={{ textAlign: 'center' }}>
        <h1 style={{
          fontFamily: 'var(--ff-display)',
          fontSize: 36,
          fontWeight: 700,
          color: 'var(--text-1)',
          letterSpacing: '-0.01em',
          lineHeight: 1.15,
          marginBottom: 8,
        }}>
          创作，从这里开始
        </h1>
        <p style={{
          fontFamily: 'var(--ff-body)',
          fontSize: 13,
          color: 'var(--text-3)',
          lineHeight: 1.7,
        }}>
          {genType === 'video' ? '上传参考素材，描述场景，生成震撼视频' : '上传参考图，描述构想，生成高质量图片'}
        </p>
      </div>

      {/* Suggestion prompts */}
      <div style={{ width: '100%', maxWidth: 540 }}>
        <p style={{
          fontFamily: 'var(--ff-mono)',
          fontSize: 9,
          color: 'var(--text-3)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          textAlign: 'center',
          marginBottom: 10,
        }}>
          {genType === 'image' ? '图片灵感 · 点击使用' : '视频灵感 · 点击使用'}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {prompts.map(p => (
            <button
              key={p.label}
              onClick={() => onSelect?.(p.text)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '10px 14px',
                background: 'var(--bg-2)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'border-color 0.15s, background 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(230,57,70,0.4)'; e.currentTarget.style.background = 'var(--bg-3)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-2)' }}
            >
              <span style={{
                fontFamily: 'var(--ff-mono)',
                fontSize: 10,
                color: 'var(--accent)',
                letterSpacing: '0.04em',
                flexShrink: 0,
                marginTop: 1,
                minWidth: 48,
              }}>{p.label}</span>
              <span style={{
                fontFamily: 'var(--ff-body)',
                fontSize: 12,
                color: 'var(--text-2)',
                lineHeight: 1.55,
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}>{p.text}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
