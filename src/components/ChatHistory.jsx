import MessageBubble from './MessageBubble'

export default function ChatHistory({ messages, onRegenerate, onEdit }) {
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
        <EmptyState />
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

function EmptyState() {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      paddingBottom: 80,
      userSelect: 'none',
    }}>
      {/* Gold ornament */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 48, height: 1, background: 'linear-gradient(to right, transparent, var(--gold))', opacity: 0.4 }} />
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)', opacity: 0.6 }} />
        <div style={{ width: 48, height: 1, background: 'linear-gradient(to left, transparent, var(--gold))', opacity: 0.4 }} />
      </div>

      <h1 style={{
        fontFamily: 'var(--ff-display)',
        fontStyle: 'italic',
        fontSize: 36,
        fontWeight: 400,
        color: 'var(--text-1)',
        letterSpacing: '0.02em',
        lineHeight: 1.2,
        textAlign: 'center',
      }}>
        创作，从这里开始
      </h1>

      <p style={{
        fontFamily: 'var(--ff-body)',
        fontSize: 13,
        color: 'var(--text-3)',
        textAlign: 'center',
        lineHeight: 1.7,
        maxWidth: 320,
      }}>
        上传参考素材，描述你的构想<br />
        Seed Studio 将为你生成图片或视频
      </p>

      {/* Hint chips */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
        {['写实人像', '概念海报', '产品展示', '动态视频'].map(tag => (
          <span
            key={tag}
            style={{
              fontFamily: 'var(--ff-body)',
              fontSize: 12,
              color: 'var(--text-3)',
              border: '1px solid var(--border)',
              borderRadius: 20,
              padding: '4px 12px',
            }}
          >{tag}</span>
        ))}
      </div>
    </div>
  )
}
