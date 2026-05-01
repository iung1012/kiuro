import { useState } from 'react'
import { App, Card, ConfigProvider, Form, Input, Button, Typography } from 'antd'
import { LockOutlined, SafetyCertificateOutlined, UserOutlined } from '@ant-design/icons'
import { setToken } from '@/lib/utils'
import { darkTheme } from '@/theme'

type Step = 'password' | '2fa'

function LoginContent() {
  const { message } = App.useApp()
  const [step, setStep] = useState<Step>('password')
  const [tempToken, setTempToken] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (values: { password: string }) => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: values.password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Falha no login')
      if (data.requires_2fa) {
        setTempToken(data.temp_token)
        setStep('2fa')
      } else {
        setToken(data.access_token)
        window.location.href = '/'
      }
    } catch (e: any) {
      message.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleTotp = async (values: { code: string }) => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/verify-totp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ temp_token: tempToken, code: values.code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Falha na verificação')
      setToken(data.access_token)
      window.location.href = '/'
    } catch (e: any) {
      message.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const cardStyle: React.CSSProperties = {
    width: 380,
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
    borderRadius: 12,
  }

  const wrapStyle: React.CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
  }

  if (step === '2fa') {
    return (
      <div style={wrapStyle}>
        <Card
          style={cardStyle}
          title={
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <SafetyCertificateOutlined style={{ fontSize: 28, color: '#6366f1', marginBottom: 8, display: 'block' }} />
              <div style={{ fontSize: 18, fontWeight: 700 }}>Verificação em duas etapas</div>
              <Typography.Text type="secondary" style={{ fontSize: 13, fontWeight: 400 }}>
                Insira o código de 6 dígitos do aplicativo autenticador
              </Typography.Text>
            </div>
          }
        >
          <Form layout="vertical" onFinish={handleTotp} requiredMark={false}>
            <Form.Item
              name="code"
              label="Código de verificação"
              rules={[
                { required: true, message: 'Por favor insira o código de verificação' },
                { len: 6, message: 'O código deve ter 6 dígitos' },
              ]}
            >
              <Input
                prefix={<SafetyCertificateOutlined />}
                placeholder="000000"
                size="large"
                maxLength={6}
                style={{ letterSpacing: 6, textAlign: 'center' }}
              />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
              <Button type="primary" htmlType="submit" block size="large" loading={loading}>
                Verificar e entrar
              </Button>
            </Form.Item>
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <Button type="link" size="small" onClick={() => setStep('password')}>
                Voltar para login com senha
              </Button>
            </div>
          </Form>
        </Card>
      </div>
    )
  }

  return (
    <div style={wrapStyle}>
      <Card
        style={cardStyle}
        title={
          <div style={{ textAlign: 'center', padding: '8px 0', background: 'transparent' }}>
            <UserOutlined style={{ fontSize: 28, color: '#6366f1', marginBottom: 8, display: 'block' }} />
            <div style={{ fontSize: 18, fontWeight: 700 }}>Account Manager</div>
            <Typography.Text type="secondary" style={{ fontSize: 13, fontWeight: 400 }}>
              Insira a senha para entrar
            </Typography.Text>
          </div>
        }
      >
        <Form layout="vertical" onFinish={handleLogin} requiredMark={false}>
          <Form.Item
            name="password"
            label="Senha"
            rules={[{ required: true, message: 'Por favor insira a senha' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Insira a senha de acesso" size="large" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
            <Button type="primary" htmlType="submit" block size="large" loading={loading}>
              Entrar
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default function Login() {
  return (
    <ConfigProvider theme={darkTheme}>
      <App>
        <LoginContent />
      </App>
    </ConfigProvider>
  )
}
