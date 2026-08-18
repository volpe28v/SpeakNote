import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import CodeMirrorEditor from '../../src/components/common/CodeMirrorEditor'

const NOOP = () => {}
const TEXT = [
  '外は雨が降っていた。',
  'Then I read the newspaper.',
  'ニュースは選挙の話だった。',
].join('\n')

describe('CodeMirrorEditor の行ヒント', () => {
  it('指定した行の下に訳文を表示する', () => {
    render(
      <CodeMirrorEditor
        value={TEXT}
        onChange={NOOP}
        hintLineIndex={1}
        hintText="それから新聞を読んだ。"
        hintLang="japanese"
        disabled
      />
    )

    const hint = screen.getByText('それから新聞を読んだ。')
    expect(hint).toHaveClass('cm-line-hint')
    expect(hint).toHaveClass('cm-line-hint-japanese')
  })

  it('日本語の行には英文を表示する', () => {
    render(
      <CodeMirrorEditor
        value={TEXT}
        onChange={NOOP}
        hintLineIndex={0}
        hintText="It was raining outside."
        hintLang="english"
        disabled
      />
    )

    const hint = screen.getByText('It was raining outside.')
    expect(hint).toHaveClass('cm-line-hint-english')
  })

  it('ヒントは対象行の直後に置かれる', () => {
    const { container } = render(
      <CodeMirrorEditor
        value={TEXT}
        onChange={NOOP}
        hintLineIndex={1}
        hintText="それから新聞を読んだ。"
        disabled
      />
    )

    const hint = container.querySelector('.cm-line-hint')
    expect(hint?.previousElementSibling?.textContent).toBe('Then I read the newspaper.')
  })

  it('hintLineIndex が null なら何も表示しない', () => {
    const { container } = render(
      <CodeMirrorEditor
        value={TEXT}
        onChange={NOOP}
        hintLineIndex={null}
        hintText="それから新聞を読んだ。"
        disabled
      />
    )

    expect(container.querySelector('.cm-line-hint')).toBeNull()
  })

  it('存在しない行を指定しても落ちない', () => {
    const { container } = render(
      <CodeMirrorEditor
        value={TEXT}
        onChange={NOOP}
        hintLineIndex={99}
        hintText="はみ出し"
        disabled
      />
    )

    expect(container.querySelector('.cm-line-hint')).toBeNull()
  })
})
