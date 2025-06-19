from transformers import pipeline

generator = pipeline("text-generation", model="gpt2")

def generate_content(prompt):
    output = generator(prompt, max_length=60, num_return_sequences=1)
    return output[0]['generated_text']
