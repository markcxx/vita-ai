"""Remove presentation-only speaker labels before text reaches SSE or TTS."""
from collections.abc import Iterable


class InterviewTextFilter:
    def __init__(self, speakers: Iterable[dict]):
        labels = {'面试官'}
        for speaker in speakers:
            name, title = speaker.get('name', ''), speaker.get('title', '')
            labels.update(v for v in (name, title, f'{name} · {title}', f'{name}（{title}）') if v)
        self.tokens = set()
        for label in labels:
            for value in (f'[{label}]', f'【{label}】', f'{label}：', f'{label}:'):
                self.tokens.update((value, f'**{value}**'))
            self.tokens.update((f'**{label}**：', f'**{label}**:'))
        self.pending = ''
        self.probing = True
        self.after_label = False

    def feed(self, delta: str) -> str:
        output = []
        for char in delta:
            if self.after_label and (char.isspace() or char in ':：'):
                continue
            self.after_label = False
            if not self.probing:
                output.append(char)
                if char == '\n':
                    self.probing = True
                continue
            self.pending += char
            value = self.pending.lstrip()
            if value in self.tokens:
                self.pending = ''
                self.after_label = True
            elif value and not any(token.startswith(value) for token in self.tokens):
                output.append(self.pending)
                self.pending = ''
                self.probing = char == '\n'
        return ''.join(output)

    def flush(self) -> str:
        pending, self.pending = self.pending, ''
        return pending


def clean_interview_text(text: str, speakers: Iterable[dict]) -> str:
    cleaner = InterviewTextFilter(speakers)
    return cleaner.feed(text) + cleaner.flush()
