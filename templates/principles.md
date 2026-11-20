## Princípios de engenharia

Valem para código novo ou alterado. [hook] é checado automaticamente; [review] entra na
rubrica de design. Se uma regra daqui contradiz o código existente, aponte o conflito e
pergunte antes de escolher, exceto nos caminhos listados em "Não copiar".

1. Regra de negócio (validação de domínio, cálculo, decisão) não fica em handler HTTP,
   componente de UI, consulta SQL ou configuração de ORM. [review]
2. Código em pastas de domínio não importa framework web, driver de banco, cliente de rede,
   sistema de arquivos nem relógio do sistema; recebe isso por parâmetro ou porta. [hook]
3. Sem ciclos entre módulos de primeiro nível. [hook]
4. Cada módulo fica no degrau declarado abaixo. Subir de degrau exige design.md e ADR. [review]
5. Interface ou porta só com duas implementações reais (o fake usado em teste conta),
   fronteira com sistema externo ou fronteira publicada. Nunca espelho de uma classe. [review]
6. Mapper ou DTO só onde os formatos diferem de fato (contrato externo, esquema de
   persistência) ou a fronteira precisa ficar estável. Cópia campo a campo não entra. [review]
7. Antes de escrever um helper, procure e reutilize o existente. Extraia código novo
   compartilhado só na terceira ocorrência do mesmo conhecimento, nunca com flag de modo. [review]
8. Nada para requisito hipotético: parâmetro, opção, ponto de extensão ou genérico só se
   um requisito ou teste atual o usa. [review]
9. Erros explícitos: valide nas fronteiras; sem catch amplo, fallback silencioso ou
   tratamento de cenário impossível. [review]
10. Complexidade cognitiva por função até 15 [hook]; refatoração e mudança de comportamento
    em commits separados. [review]

### Degraus por módulo
| Módulo | Degrau | Motivo |
|---|---|---|
| <src/cadastro> | 1 — script de transação | CRUD sem invariantes entre campos |
| <src/cobranca> | 3 — modelo de domínio | core: regras mudam com frequência |
| <autenticação> | genérico — <biblioteca> | não diferencia o produto |

Degraus: 1 script de transação; 2 funções de domínio puras separadas do I/O; 3 modelo de
domínio (entidades com comportamento, agregados, repositório por raiz); genérico (biblioteca
pronta); organizacional (vários deployables, só com muitos times).

### Exemplares e o que não copiar
Siga: <caminho> (<por quê>). Não copie: <caminho/**> (<por quê>).

### Checagem
Arquitetura: `<comando>` · Lint/complexidade: `<comando>` · Testes: `<comando>`
```
