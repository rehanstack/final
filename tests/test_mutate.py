from langchain_core.messages import AIMessage
msg = AIMessage(content="<think>test</think> hello")
print(msg.content)
msg.content = "new"
print(msg.content)
