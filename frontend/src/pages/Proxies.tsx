import { useEffect, useState, type Key } from 'react'
import { Card, Table, Button, Input, Tag, Space, Popconfirm, message, Modal } from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SwapRightOutlined,
  SwapLeftOutlined,
} from '@ant-design/icons'
import { apiFetch } from '@/lib/utils'

export default function Proxies() {
  const [proxies, setProxies] = useState<any[]>([])
  const [newProxy, setNewProxy] = useState('')
  const [region, setRegion] = useState('')
  const [checking, setChecking] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([])

  const load = async () => {
    setLoading(true)
    try {
      const data = await apiFetch('/proxies')
      setProxies(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const add = async () => {
    if (!newProxy.trim()) return
    const lines = newProxy.trim().split('\n').map((l) => l.trim()).filter(Boolean)
    try {
      if (lines.length > 1) {
        await apiFetch('/proxies/bulk', {
          method: 'POST',
          body: JSON.stringify({ proxies: lines, region }),
        })
      } else {
        await apiFetch('/proxies', {
          method: 'POST',
          body: JSON.stringify({ url: lines[0], region }),
        })
      }
      message.success('Adicionado com sucesso')
      setNewProxy('')
      setRegion('')
      load()
    } catch (e: any) {
      message.error(`Falha ao adicionar: ${e.message}`)
    }
  }

  const del = async (id: number) => {
    try {
      await apiFetch(`/proxies/${id}`, { method: 'DELETE' })
      message.success('Excluído com sucesso')
      setSelectedRowKeys((prev) => prev.filter((key) => key !== id))
      load()
    } catch (e: any) {
      message.error(`Falha ao excluir: ${e.message || 'Erro desconhecido'}`)
    }
  }

  const batchDel = async () => {
    if (selectedRowKeys.length === 0) return
    const ids = selectedRowKeys.map((key) => Number(key)).filter((v) => Number.isFinite(v))
    try {
      const result = await apiFetch('/proxies/batch-delete', {
        method: 'POST',
        body: JSON.stringify({ ids }),
      }) as { deleted: number; not_found?: number[]; total_requested?: number }
      setSelectedRowKeys([])
      load()

      const notFound = (result.not_found || []) as number[]
      Modal.success({
        title: 'Resultado da exclusão em lote',
        okText: 'Ok',
        content: (
          <div>
            <div>Solicitados para excluir: {result.total_requested ?? ids.length}</div>
            <div>Excluídos com sucesso: {result.deleted ?? 0}</div>
            <div>Não encontrados: {notFound.length}</div>
            {notFound.length > 0 && (
              <div style={{ marginTop: 8, maxHeight: 120, overflow: 'auto', fontFamily: 'monospace' }}>
                {notFound.join(', ')}
              </div>
            )}
          </div>
        ),
      })
    } catch (e: any) {
      message.error(`Falha na exclusão em lote: ${e.message || 'Erro desconhecido'}`)
    }
  }

  const toggle = async (id: number) => {
    await apiFetch(`/proxies/${id}/toggle`, { method: 'PATCH' })
    load()
  }

  const check = async () => {
    setChecking(true)
    await apiFetch('/proxies/check', { method: 'POST' })
    setTimeout(() => {
      load()
      setChecking(false)
    }, 3000)
  }

  const columns: any[] = [
    {
      title: 'Endereço do Proxy',
      dataIndex: 'url',
      key: 'url',
      render: (text: string) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{text}</span>,
    },
    {
      title: 'Região',
      dataIndex: 'region',
      key: 'region',
      render: (text: string) => text || '-',
    },
    {
      title: 'Sucesso/Falha',
      key: 'stats',
      render: (_: any, record: any) => (
        <Space>
          <Tag color="success">{record.success_count}</Tag>
          <span>/</span>
          <Tag color="error">{record.fail_count}</Tag>
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active: boolean) => (
        <Tag color={active ? 'success' : 'error'} icon={active ? <CheckCircleOutlined /> : <CloseCircleOutlined />}>
          {active ? 'Ativo' : 'Desativado'}
        </Tag>
      ),
    },
    {
      title: 'Ações',
      key: 'action',
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={record.is_active ? <SwapLeftOutlined /> : <SwapRightOutlined />}
            onClick={() => toggle(record.id)}
          />
          <Popconfirm
            title="Confirmar exclusão deste proxy?"
            onConfirm={() => del(record.id)}
            okText="Excluir"
            cancelText="Cancelar"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 'bold', margin: 0 }}>Gerenciar Proxies</h1>
          <p style={{ color: '#7a8ba3', marginTop: 4 }}>Total de {proxies.length} proxies</p>
        </div>
        <Button icon={<ReloadOutlined spin={checking} />} onClick={check} loading={checking}>
          Verificar todos
        </Button>
      </div>

      <Card title="Adicionar proxy (um por linha)">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Input.TextArea
            value={newProxy}
            onChange={(e) => setNewProxy(e.target.value)}
            placeholder="http://user:pass@host:port"
            rows={3}
            style={{ fontFamily: 'monospace' }}
          />
          <Space>
            <Input
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="Rótulo de região (ex: US, SG)"
              style={{ width: 200 }}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={add}>
              Adicionar
            </Button>
          </Space>
        </Space>
      </Card>

      <Card>
        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ color: '#7a8ba3' }}>
            Selecionados: {selectedRowKeys.length}
          </div>
          <Popconfirm
            title={`Confirmar exclusão dos ${selectedRowKeys.length} proxies selecionados?`}
            onConfirm={batchDel}
            okText="Excluir"
            cancelText="Cancelar"
            okButtonProps={{ danger: true }}
            disabled={selectedRowKeys.length === 0}
          >
            <Button danger icon={<DeleteOutlined />} disabled={selectedRowKeys.length === 0}>
              Excluir em lote
            </Button>
          </Popconfirm>
        </div>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={proxies}
          loading={loading}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
          }}
          pagination={false}
        />
      </Card>
    </div>
  )
}
