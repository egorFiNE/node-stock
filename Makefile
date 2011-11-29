.PHONY : docs test

all: 
	@echo make what? Valid targets: docs, test

docs: 
	for i in *js; do node ../docmakr/doc.js --out docs/ $$i; done

test:
	TZ=America/New_York nodeunit test/
