.PHONY: build test typecheck clean publish

build:
	npm run build

test:
	npm test

typecheck:
	npm run typecheck

clean:
	rm -rf dist *.tgz

publish: clean typecheck test build
	npm publish --access public
	rm -rf dist *.tgz
	@echo "Published kiqr@$$(node -p "require('./package.json').version")"
