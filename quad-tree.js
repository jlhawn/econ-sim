(function() {
    class Point {
        constructor (x, y) {
            this.x = x;
            this.y = y;
        }

        translate(vec) {
            this.x += vec.dx;
            this.y += vec.dy;
        }

        vectorFrom(point) {
            return new Vector(this.x - point.x, this.y - point.y);
        }
    }
    window.Point = Point;

    class Rectangle {
        constructor(minX, minY, maxX, maxY) {
            this.minX = minX;
            this.minY = minY;
            this.maxX = maxX;
            this.maxY = maxY;
        }

        contains(point) {
            return this.minX <= point.x && point.x < this.maxX && this.minY <= point.y && point.y < this.maxY;
        }

        overlaps(rect) {
            // Simpler to determine if the rectangles *DO NOT* overlap and return logical-NOT of that.
            return !(this.maxX <= rect.minX || rect.maxX <= this.minX || this.maxY <= rect.minY || rect.maxY <= this.minY);
        }

        path2D() {
            var path = new Path2D();
            path.rect(this.minX, this.minY, this.maxX-this.minX, this.maxY-this.minY);
            return path;
        }

        width() {
            return this.maxX - this.minX;
        }

        height() {
            return this.maxY - this.minY;
        }

        scale(scale) {
            return new Rectangle(this.minX*scale, this.minY*scale, this.maxX*scale, this.maxY*scale);
        }

        pad(padX, padY) {
            return new Rectangle(this.minX-padX, this.minY-padY, this.maxX+padX, this.maxY+padY);
        }
    }
    window.Rectangle = Rectangle;

    class LinkedList {
        constructor() {
            this.head = null;
            this.tail = null;
            this.size = 0;
        }

        get length() { return this.size; }

        isEmpty() { return this.size === 0; }

        extend(otherList) {
            if (this.isEmpty()) {
                this.head = otherList.head;
                this.tail = otherList.tail;
                this.size = otherList.size;
            } else if (!otherList.isEmpty()) {
                this.tail.next = otherList.head;
                this.tail = otherList.tail;
                this.size += otherList.size; 
            }   
            return this;
        }

        append(value) {
            var node = {value: value, next: null};
            if (this.isEmpty()) {
                this.head = node;
                this.tail = node;
            } else {
                this.tail.next = node;
                this.tail = this.tail.next;
            }
            this.size++;
            return this;
        }

        [Symbol.iterator]() {
            return {
                node: this.head,
                item: {value: null, done: false},
                next() {
                    if (this.node === null) {
                        return {done: true};
                    }

                    this.item.value = this.node.value;
                    this.node = this.node.next;
                    return this.item;
                }
            };
        }
    }
    window.LinkedList = LinkedList;

    class QuadTreeItem {
        constructor(point, ref, node) {
            this.point = point;
            this.ref = ref;
            this.node = node;
        }

        move(point) {
            if (this.node.contains(point)) {
                return; // Still in this node.
            }

            var newItem = null;
            var ancestor = this.node.parent;
            while (ancestor !== null) {
                if (ancestor.contains(point)) {
                    // Insert and get new item;
                    newItem = ancestor.insert(point, this.ref);
                    break;
                }
                ancestor = ancestor.parent;
            }

            // Remove this item from its current node.
            this.remove();
            if (newItem === null) {
                console.log("No newItem", this);
                throw new Error("no new item");
            }
            // Attach this item to its new node.
            this.node = newItem.node;
            this.node.item = this;
        }

        remove() {
            this.node.item = null;

            var ancestor = this.node.parent;
            while (ancestor !== null && ancestor.simplify()) {
                ancestor = ancestor.parent;
            }
        }
    }

    class QuadTree extends Rectangle {
        constructor(minX, minY, maxX, maxY, parent, quadrant) {
            super(minX, minY, maxX, maxY);

            this.parent = parent || null;
            this.id = (parent && parent.id || "") + (quadrant || "");
            this.item = null;
            this.subTrees = null;
        }

        isEmpty() {
            return this.item === null && this.subTrees === null;
        }

        simplify() {
            if (this.subTrees === null) {
                return false; // Nothing to simplify.
            }

            // If any of the subtrees have any other subtrees then
            // we can't simplify either. That implies that there are
            // multiple items in that subtree.
            var directSubItemCount = 0;
            var directSubItem = null;
            for (var subTree of this.subTrees) {
                if (subTree.subTrees !== null) {
                    return false; // subtree with subtrees.
                }
                if (subTree.item !== null) {
                    directSubItemCount++;
                    directSubItem = subTree.item;
                }
            }

            if (directSubItemCount === 0) {
                // This is a bug.
                throw new Error("all subtrees have no item or sub-items: "+this.id);
            }

            if (directSubItemCount !== 1) {
                return false; // Can only simplify if there is a single sub-item;
            }

            this.item = directSubItem;
            directSubItem.node = this;
            this.subTrees = null;
            return true;
        }   

        split() {
            var midX = (this.minX + this.maxX) / 2.0;
            var midY = (this.minY + this.maxY) / 2.0;

            this.subTrees = [
                new QuadTree(this.minX, this.minY, midX, midY, this, "A"), // Top-Left.
                new QuadTree(midX, this.minY, this.maxX, midY, this, "B"), // Top-Right.
                new QuadTree(this.minX, midY, midX, this.maxY, this, "C"), // Bottom-Left.
                new QuadTree(midX, midY, this.maxX, this.maxY, this, "D"), // Bottom-Right.
            ];

            for(var subTree of this.subTrees) {
                if (subTree.contains(this.item.point)) {
                    subTree.item = this.item;
                    subTree.item.node = subTree;
                    this.item = null;
                    return;
                }
            }
        }

        insert(point, ref) {
            if (this.isEmpty()) {
                this.item = new QuadTreeItem(point, ref, this);
                return this.item;
            }

            if (this.subTrees === null) {
                this.split();
            }

            for (var subTree of this.subTrees) {
                if (subTree.contains(point)) {
                    return subTree.insert(point, ref);
                }
            }
        }

        itemsInRange(rect) {
            var vals = new LinkedList();
            if (this.isEmpty() || !this.overlaps(rect)) {
                return vals;
            }

            if (this.subTrees === null) {
                if (rect.contains(this.item.point)) {
                    vals.append(this.item.ref);
                }
                return vals;
            }

            for (var subTree of this.subTrees) {
                vals = vals.extend(subTree.itemsInRange(rect));
            }
            return vals;
        }

        path2Ds() {
            var paths = [this.path2D()];
            if (this.subTrees !== null) {
                for (var subTree of this.subTrees) {
                    paths.push(...subTree.path2Ds());
                }
            }
            return paths;
        }
    }
    window.QuadTree = QuadTree;
})();
